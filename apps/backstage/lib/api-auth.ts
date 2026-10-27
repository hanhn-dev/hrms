import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  canAccess,
  FEATURE_ROLES,
  isAuthDisabled,
  type Feature,
} from "@/shared/auth/access";
import { localFullAccessUser, type GateUser } from "@/shared/auth/auth";

export type ApiUser = {
  oid: string;
  name: string;
  email?: string;
  isAdmin: boolean;
  roles: string[];
};

export async function requireUser(): Promise<
  | { ok: true; user: ApiUser }
  | { ok: false; response: NextResponse }
> {
  const user = await readApiUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sign in required" }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

export async function requireAdmin(): Promise<
  | { ok: true; user: ApiUser }
  | { ok: false; response: NextResponse }
> {
  return requireApiFeature("guides");
}

export async function requireApiFeature(
  feature: Feature,
): Promise<
  | { ok: true; user: ApiUser }
  | { ok: false; response: NextResponse }
> {
  const result = await requireUser();
  if (!result.ok) return result;
  if (!canAccess(result.user.roles, feature)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `${FEATURE_ROLES[feature]} role required` },
        { status: 403 },
      ),
    };
  }
  return result;
}

async function readApiUser(): Promise<ApiUser | null> {
  if (isAuthDisabled()) {
    return toApiUser(localFullAccessUser());
  }
  const session = await auth();
  const user = session?.user;
  if (!user?.oid) return null;
  return toApiUser({
    oid: user.oid,
    name: user.name ?? null,
    email: user.email ?? null,
    roles: Array.isArray(user.roles) ? user.roles : [],
    isAdmin: Boolean(user.isAdmin),
  });
}

function toApiUser(user: GateUser): ApiUser {
  return {
    oid: user.oid,
    name: user.name?.trim() || user.email || "Unknown",
    email: user.email ?? undefined,
    isAdmin: user.isAdmin,
    roles: user.roles,
  };
}
