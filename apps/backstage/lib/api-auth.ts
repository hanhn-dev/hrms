import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function requireUser(): Promise<
  | { ok: true; user: { oid: string; name: string; email?: string; isAdmin: boolean } }
  | { ok: false; response: NextResponse }
> {
  const session = await auth();
  const user = session?.user;
  if (!user?.oid) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sign in required" }, { status: 401 }),
    };
  }
  return {
    ok: true,
    user: {
      oid: user.oid,
      name: user.name?.trim() || user.email || "Unknown",
      email: user.email ?? undefined,
      isAdmin: Boolean(user.isAdmin),
    },
  };
}

export async function requireAdmin(): Promise<
  | { ok: true; user: { oid: string; name: string; email?: string; isAdmin: boolean } }
  | { ok: false; response: NextResponse }
> {
  const result = await requireUser();
  if (!result.ok) return result;
  if (!result.user.isAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Admin role required" }, { status: 403 }),
    };
  }
  return result;
}
