import { timingSafeEqual } from "node:crypto";
import NextAuth, { type NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { writesAllowedForEnvironment } from "@/shared/db/environments";

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.AUTH_SECRET &&
      process.env.TROUBLESHOOTER_ADMIN_USERNAME &&
      process.env.TROUBLESHOOTER_ADMIN_PASSWORD,
  );
}

export function areWritesEnabled(environment: string): boolean {
  if (process.env.TROUBLESHOOTER_WRITES_ENABLED !== "1") {
    return false;
  }
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return writesAllowedForEnvironment(environment);
}

export function getAuditUserId(): number {
  const raw = process.env.TROUBLESHOOTER_AUDIT_USER_ID;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      "Set TROUBLESHOOTER_AUDIT_USER_ID to a real TUsers.UserID before writing.",
    );
  }
  return parsed;
}

const nextAuth: NextAuthResult = NextAuth({
  secret: process.env.AUTH_SECRET ?? "troubleshooter-unconfigured",
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Local root admin",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: (credentials) => {
        if (!isAuthConfigured()) {
          return null;
        }
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }
        const expectedUser = process.env.TROUBLESHOOTER_ADMIN_USERNAME ?? "";
        const expectedPassword = process.env.TROUBLESHOOTER_ADMIN_PASSWORD ?? "";
        if (
          !safeEqual(parsed.data.username, expectedUser) ||
          !safeEqual(parsed.data.password, expectedPassword)
        ) {
          return null;
        }
        return {
          id: "root-admin",
          name: "Root Admin",
          email: "root@localhost",
          isRootAdmin: true,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.isRootAdmin = user.isRootAdmin === true;
      }
      return token;
    },
    session({ session, token }) {
      session.user.isRootAdmin = token.isRootAdmin === true;
      return session;
    },
  },
});

export const handlers: NextAuthResult["handlers"] = nextAuth.handlers;
export const auth: NextAuthResult["auth"] = nextAuth.auth;
export const signIn: NextAuthResult["signIn"] = nextAuth.signIn;
export const signOut: NextAuthResult["signOut"] = nextAuth.signOut;

export async function requireRootAdmin(): Promise<{
  name?: string | null;
  email?: string | null;
  isRootAdmin: boolean;
}> {
  const session = await auth();
  if (!session?.user?.isRootAdmin) {
    throw new Error("Root admin session required.");
  }
  return session.user;
}

export function assertWritesEnabled(environment: string): void {
  if (!areWritesEnabled(environment)) {
    throw new Error(
      "Writes are disabled. Set TROUBLESHOOTER_WRITES_ENABLED=1 in a non-production environment listed in TROUBLESHOOTER_WRITES_ENVS.",
    );
  }
}
