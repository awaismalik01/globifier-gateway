import { next } from "@vercel/functions";

export const config = {
  matcher: ["/api/:path*"],
};

export default function middleware(req: Request) {
  console.log("Hi");
  const url = new URL(req.url);

  const newHeaders = new Headers(req.headers);

  const cookie =
    req.headers
      ?.get("cookie")
      ?.split(";")
      .map((c) => c.trim()) || [];

  const filteredCookies = cookie
    .filter((c) => !c.startsWith("auth_token="))
    .join("; ");
  newHeaders.set("cookie", filteredCookies);

  if (url.pathname === "/api/auth/login") {
    return next({
      request: { headers: newHeaders },
    });
  }
  console.log(cookie);
  const tokenCookie = cookie.find((c) => c.startsWith("auth_token="));
  console.log(tokenCookie);
  const token = tokenCookie?.substring("auth_token=".length);
  console.log(token);

  if (!token) {
    return new Response("Access Denied", { status: 403 });
  }

  newHeaders.set("Authorization", `Bearer ${token}`);

  return next({
    request: { headers: newHeaders },
  });
}
