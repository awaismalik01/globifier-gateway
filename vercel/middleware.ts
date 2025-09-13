import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/api/:path*"],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Allow login route without token
  if (url.pathname === "/api/auth/login") {
    return NextResponse.next();
  }

  // Read cookie
  const token = req.cookies.get("auth_token")?.value;

  if (!token) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  // Clone request and forward token as header
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("Authorization", `Bearer ${token}`);

  // Pass the modified request to the destination
  return NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders,
    },
  });
}
