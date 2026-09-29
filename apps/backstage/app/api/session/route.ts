import { NextResponse } from "next/server";
import { auth, getAuthProviders, isAuthConfigured } from "@/auth";

export async function GET(): Promise<NextResponse> {
  const configured = isAuthConfigured();
  if (!configured) {
    return NextResponse.json({
      configured: false,
      providers: [] as Array<"microsoft-entra-id" | "dev">,
      user: null,
    });
  }

  const session = await auth();
  const providers = getAuthProviders().filter(
    (provider): provider is "microsoft-entra-id" | "dev" =>
      provider === "microsoft-entra-id" || provider === "dev",
  );
  return NextResponse.json({
    configured: true,
    providers,
    user: session?.user
      ? {
          name: session.user.name ?? session.user.email ?? undefined,
          isAdmin: Boolean(session.user.isAdmin),
        }
      : null,
  });
}
