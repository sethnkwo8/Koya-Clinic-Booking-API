import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_PATHS = ["/slots", "/bookings", "/reset"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isApiPath =
    API_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );

  if (!isApiPath) {
    return NextResponse.next();
  }

  const key = request.headers.get("X-API-Key");
  const expected = process.env.API_KEY;

  if (!expected || key !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/slots", "/bookings/:path*", "/reset"],
};
