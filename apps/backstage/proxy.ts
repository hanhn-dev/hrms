import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { decideAccess, isAuthDisabled } from "@/shared/auth/access";

const handle = auth((request) => {
  const decision = decideAccess({
    pathname: request.nextUrl.pathname,
    method: request.method,
    authDisabled: isAuthDisabled(),
    session: request.auth?.user
      ? { roles: request.auth.user.roles ?? [] }
      : null,
  });

  if (decision.kind === "allow") {
    return NextResponse.next();
  }
  if (decision.kind === "json") {
    return NextResponse.json(
      { error: decision.error },
      { status: decision.status },
    );
  }

  const url = request.nextUrl.clone();
  url.search = "";
  if (decision.kind === "login") {
    url.pathname = "/login";
    url.searchParams.set(
      "callbackUrl",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(url);
  }
  url.pathname = "/forbidden";
  url.searchParams.set("area", decision.area);
  return NextResponse.redirect(url);
});

export async function proxy(request: NextRequest): Promise<Response> {
  const response = await handle(request, { params: Promise.resolve({}) });
  if (response instanceof Response) {
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
