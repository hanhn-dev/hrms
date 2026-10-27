import { NextResponse } from "next/server";
import { auth, getAuthProviders, isAuthConfigured } from "@/auth";
import { isAuthDisabled, localFullAccessRoles } from "@/shared/auth/access";

export async function GET(): Promise<NextResponse> {
  if (isAuthDisabled()) {
    return NextResponse.json({
      configured: true,
      authDisabled: true,
      providers: [] as Array<"microsoft-entra-id" | "dev">,
      user: {
        name: "Auth off",
        isAdmin: true,
        roles: localFullAccessRoles(),
      },
    });
  }

  const configured = isAuthConfigured();
  if (!configured) {
    return NextResponse.json({
      configured: false,
      authDisabled: false,
      providers: [] as Array<"microsoft-entra-id" | "dev">,
      user: null,
    });
  }

  const session = await auth();
  const providers = getAuthProviders();
  const roles = Array.isArray(session?.user?.roles) ? session.user.roles : [];
  return NextResponse.json({
    configured: true,
    authDisabled: false,
    providers,
    user: session?.user
      ? {
          name: session.user.name ?? session.user.email ?? undefined,
          isAdmin: Boolean(session.user.isAdmin),
          roles,
        }
      : null,
  });
}
