import NextAuth, { type NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import type { Provider } from "next-auth/providers";

const ADMIN_ROLE = "Backstage.Admin";

export function isEntraConfigured(): boolean {
  return Boolean(
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
  );
}

export function isDevAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.BACKSTAGE_DEV_AUTH === "1"
  );
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET) && (isEntraConfigured() || isDevAuthEnabled());
}

export function getAuthProviders(): Array<"microsoft-entra-id" | "dev"> {
  const providers: Array<"microsoft-entra-id" | "dev"> = [];
  if (isEntraConfigured()) providers.push("microsoft-entra-id");
  if (isDevAuthEnabled()) providers.push("dev");
  return providers;
}

function decodeJwtPayload(idToken: string): Record<string, unknown> {
  const part = idToken.split(".")[1];
  if (!part) return {};
  const json = Buffer.from(
    part.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf8");
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function rolesFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((role): role is string => typeof role === "string");
  }
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
}

function buildProviders(): Provider[] {
  const providers: Provider[] = [];
  if (isEntraConfigured()) {
    providers.push(
      MicrosoftEntraID({
        clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
        clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
        issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      }),
    );
  }
  if (isDevAuthEnabled()) {
    providers.push(
      Credentials({
        id: "dev",
        name: "Local development",
        credentials: {
          continue: { label: "Continue", type: "hidden" },
        },
        authorize: () => ({
          id: "dev-user",
          name: process.env.BACKSTAGE_DEV_NAME ?? "Local contributor",
          email: "dev@localhost",
          oid: "dev-oid",
          roles:
            process.env.BACKSTAGE_DEV_ADMIN === "1" ? [ADMIN_ROLE] : [],
        }),
      }),
    );
  }
  return providers;
}

const nextAuth: NextAuthResult = NextAuth({
  secret: process.env.AUTH_SECRET ?? "backstage-unconfigured",
  trustHost: true,
  providers: buildProviders(),
  callbacks: {
    jwt({ token, user, account }) {
      if (user) {
        token.oid = user.oid ?? user.id;
        token.roles = user.roles ?? [];
      }
      if (account?.id_token) {
        const payload = decodeJwtPayload(account.id_token);
        const roles = rolesFromUnknown(payload.roles);
        if (roles.length > 0) token.roles = roles;
        if (typeof payload.oid === "string") token.oid = payload.oid;
      }
      return token;
    },
    session({ session, token }) {
      const roles = Array.isArray(token.roles) ? token.roles : [];
      session.user.oid = String(token.oid ?? token.sub ?? "");
      session.user.roles = roles;
      session.user.isAdmin = roles.includes(ADMIN_ROLE);
      return session;
    },
  },
});

export const handlers: NextAuthResult["handlers"] = nextAuth.handlers;
export const auth: NextAuthResult["auth"] = nextAuth.auth;
export const signIn: NextAuthResult["signIn"] = nextAuth.signIn;
export const signOut: NextAuthResult["signOut"] = nextAuth.signOut;
