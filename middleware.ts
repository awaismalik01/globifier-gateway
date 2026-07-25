import { next } from "@vercel/functions";
import { jwtVerify } from "jose";

export const config = {
  matcher: ["/api/:path*"],
};

export default async function middleware(req: Request) {
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

  const tokenCookie = cookie.find((c) => c.startsWith("auth_token="));
  const token = tokenCookie?.substring("auth_token=".length);

  if (!token) {
    return new Response("Access Denied", { status: 403 });
  }

  // Verify the JWT signature and expiry
  const secret = process.env.GLOBIFIER_JWT_SECRET;
  if (!secret) {
    return new Response("Server configuration error", { status: 500 });
  }

  try {
    const encodedSecret = new TextEncoder().encode(secret);
    await jwtVerify(token, encodedSecret, { algorithms: ["HS256"] });
  } catch (error: unknown) {
    const isExpired =
      error instanceof Error && error.message.includes('"exp" claim');

    if (isExpired) {
      return new Response(
        JSON.stringify({ message: "Token expired", code: "TOKEN_EXPIRED" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie":
              "auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
          },
        }
      );
    }

    // Invalid signature or malformed token
    return new Response(
      JSON.stringify({ message: "Invalid token", code: "TOKEN_INVALID" }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie":
            "auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        },
      }
    );
  }

  newHeaders.set("Authorization", `Bearer ${token}`);

  return next({
    request: { headers: newHeaders },
  });
}
