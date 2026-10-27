import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import {
  canAccess,
  isAuthDisabled,
  localFullAccessRoles,
  type Feature,
} from "@/shared/auth/access";
import { writesAllowedForEnvironment } from "@/shared/db/environments";

export { auth, signIn, signOut };

export type GateUser = {
  oid: string;
  name: string | null;
  email: string | null;
  roles: string[];
  isAdmin: boolean;
};

export function localFullAccessUser(): GateUser {
  const roles = localFullAccessRoles();
  return {
    oid: "local-auth-disabled",
    name: "Auth off",
    email: null,
    roles,
    isAdmin: true,
  };
}

export async function currentGateUser(): Promise<GateUser | null> {
  if (isAuthDisabled()) {
    return localFullAccessUser();
  }
  const session = await auth();
  const user = session?.user;
  if (!user?.oid) {
    return null;
  }
  const roles = Array.isArray(user.roles) ? user.roles : [];
  return {
    oid: user.oid,
    name: user.name ?? null,
    email: user.email ?? null,
    roles,
    isAdmin: roles.includes("Backstage.Admin") || user.isAdmin === true,
  };
}

export async function requireFeature(feature: Feature): Promise<GateUser> {
  const user = await currentGateUser();
  if (!user) {
    redirect("/login");
  }
  if (!canAccess(user.roles, feature)) {
    redirect(`/forbidden?area=${feature}`);
  }
  return user;
}

export async function requireFeaturePage(feature: Feature): Promise<GateUser> {
  return requireFeature(feature);
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

export function assertWritesEnabled(environment: string): void {
  if (!areWritesEnabled(environment)) {
    throw new Error(
      "Writes are disabled. Set TROUBLESHOOTER_WRITES_ENABLED=1 in a non-production environment listed in TROUBLESHOOTER_WRITES_ENVS.",
    );
  }
}
