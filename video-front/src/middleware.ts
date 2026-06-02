import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("vf_token")?.value;
  const protectedPath = ["/dashboard", "/projects", "/channels", "/background-videos", "/settings"].some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (protectedPath && !token) return NextResponse.redirect(new URL("/login", request.url));
  if ((request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register") && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
