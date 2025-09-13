import { next } from "@vercel/functions";

export const config = {
  matcher: ["/api/:path*"],
};

export default function middleware(req: Request) {
  const url = new URL(req.url);

  if (url.pathname === "/api/auth/login") {
    return next();
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("auth_token="))
    ?.split("=")[1];

  if (!token) {
    return new Response("Unauthorized", { status: 403 });
  }

  return next({
    headers: { Authorization: `Bearer ${token}` },
  });
}
