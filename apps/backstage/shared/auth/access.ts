export const ADMIN_ROLE = "Backstage.Admin";

export const FEATURE_ROLES = {
  employers: "Backstage.Employers",
  dbs: "Backstage.Dbs",
  azure: "Backstage.Azure",
  guides: ADMIN_ROLE,
} as const;

export type Feature = keyof typeof FEATURE_ROLES;

export type AccessEnv = {
  NODE_ENV?: string;
  BACKSTAGE_AUTH_DISABLED?: string;
  BACKSTAGE_DEV_ADMIN?: string;
  BACKSTAGE_DEV_ROLES?: string;
};

export type GateDecision =
  | { kind: "allow" }
  | { kind: "login" }
  | { kind: "forbidden"; area: Feature }
  | { kind: "json"; status: 401 | 403; error: string };

const FEATURE_ORDER: readonly Feature[] = [
  "employers",
  "dbs",
  "azure",
  "guides",
];

export function isAuthDisabled(env: AccessEnv = process.env): boolean {
  return env.NODE_ENV !== "production" && env.BACKSTAGE_AUTH_DISABLED === "1";
}

export function rolesFromDevEnv(env: AccessEnv = process.env): string[] {
  const roles = new Set<string>();
  if (env.BACKSTAGE_DEV_ADMIN === "1") {
    roles.add(ADMIN_ROLE);
  }
  for (const part of (env.BACKSTAGE_DEV_ROLES ?? "").split(",")) {
    const role = part.trim();
    if (role.length > 0) {
      roles.add(role);
    }
  }
  return [...roles];
}

export function localFullAccessRoles(): string[] {
  return [...new Set([ADMIN_ROLE, ...Object.values(FEATURE_ROLES)])];
}

export function canAccess(
  roles: readonly string[],
  feature: Feature,
): boolean {
  if (roles.includes(ADMIN_ROLE)) {
    return true;
  }
  return roles.includes(FEATURE_ROLES[feature]);
}

export function featureForPath(
  pathname: string,
  method = "GET",
): Feature | null {
  const path = pathname.split("?")[0] ?? pathname;
  if (matchesPrefix(path, "/employers")) return "employers";
  if (matchesPrefix(path, "/dbs")) return "dbs";
  if (matchesPrefix(path, "/azure") || matchesPrefix(path, "/api/azure")) {
    return "azure";
  }
  if (path === "/docs/guides/proposals") {
    return "guides";
  }
  if (path === "/api/guides/proposals") {
    return method.toUpperCase() === "POST" ? null : "guides";
  }
  if (
    path.endsWith("/approve") ||
    path.endsWith("/reject")
  ) {
    if (path.startsWith("/api/guides/proposals/")) return "guides";
  }
  return null;
}

export function decideAccess(input: {
  pathname: string;
  method?: string;
  authDisabled: boolean;
  session: { roles: readonly string[] } | null;
}): GateDecision {
  if (input.authDisabled || isPublicPath(input.pathname)) {
    return { kind: "allow" };
  }
  const feature = featureForPath(input.pathname, input.method ?? "GET");
  const api = isApiPath(input.pathname);
  if (!input.session) {
    if (api) {
      return { kind: "json", status: 401, error: "Sign in required" };
    }
    return { kind: "login" };
  }
  if (feature && !canAccess(input.session.roles, feature)) {
    if (api) {
      return {
        kind: "json",
        status: 403,
        error: `${FEATURE_ROLES[feature]} role required`,
      };
    }
    return { kind: "forbidden", area: feature };
  }
  return { kind: "allow" };
}

/** Relative in-app path only. Anything else becomes `/`. */
export function safeCallbackPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }
  if (raw.startsWith("/login") || raw.startsWith("/forbidden")) {
    return "/";
  }
  return raw;
}

export function featuresForRoles(roles: readonly string[]): Feature[] {
  return FEATURE_ORDER.filter((feature) => canAccess(roles, feature));
}

function isPublicPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  if (path === "/login" || path.startsWith("/login/")) return true;
  if (path === "/forbidden" || path.startsWith("/forbidden/")) return true;
  if (path === "/api/auth" || path.startsWith("/api/auth/")) return true;
  if (path === "/api/session") return true;
  if (path.startsWith("/_next/")) return true;
  if (path === "/favicon.ico") return true;
  return false;
}

function isApiPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return path === "/api" || path.startsWith("/api/");
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}
