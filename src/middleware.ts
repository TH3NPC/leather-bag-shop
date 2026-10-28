import { NextResponse, type NextRequest } from "next/server";

// Fast path only: sends visitors without a session cookie to the login page.
// Real authentication and authorization happen on the server for every admin
// page (requireAdminPage) and every admin API (adminRoute).
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (!req.cookies.has("shop_admin_session")) {
    if (pathname.startsWith("/api/admin")) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/((?!auth/login).*)"],
};
