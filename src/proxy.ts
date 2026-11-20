import { NextResponse, type NextRequest } from "next/server";
import { tenantFromHost } from "@/lib/tenant";

const SESSION_COOKIE = "sahm_session";

/**
 * 1. Subdomain tenancy: `nakhla.<ROOT_DOMAIN>/orders` is served by `/s/nakhla/orders`.
 * 2. Optimistic auth gate: no cookie → login. The real check (signature, membership,
 *    role) happens in the Data Access Layer on every request.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const tenant = tenantFromHost(request.headers.get("host"), process.env.ROOT_DOMAIN);
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (tenant && !pathname.startsWith("/s/") && !pathname.startsWith("/login")) {
    if (!hasSession)
      return NextResponse.redirect(
        new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url),
      );
    const url = request.nextUrl.clone();
    url.pathname = `/s/${tenant}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith("/s/") && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)"],
};
