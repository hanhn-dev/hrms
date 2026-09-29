import { auth, isOpsCredentialsConfigured, signIn, signOut } from "@/auth";
import { writesAllowedForEnvironment } from "@/shared/db/environments";

export { auth, signIn, signOut };

/** Ops login: local Troubleshooter root-admin credentials. */
export function isAuthConfigured(): boolean {
  return isOpsCredentialsConfigured();
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
