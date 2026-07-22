# Globifier Gateway

## Overview

`globifier-gateway` is the entry point for the entire Globifier platform. It is a Vercel edge-middleware-based reverse proxy that routes traffic to the appropriate backend and frontend services, while enforcing authentication at the edge.

## Architecture

This is a **multi-root workspace**. The two sibling projects are:

| Project | Role | Local Port |
|---|---|---|
| `globifier-gateway` | Vercel edge gateway / reverse proxy | 3000 (vercel dev) |
| `globifier-auth-be` | NestJS auth + user API | 8000 |
| `globifier-auth-fe` | Frontend (Vite/React, separate repo) | 5173 |

All three services are started together via `npm start` in the gateway root, which uses `concurrently`.

## Repository Structure

```
globifier-gateway/
├── package.json           # Root scripts — uses concurrently to start all services
└── vercel/
    ├── middleware.ts       # Vercel edge middleware — auth enforcement on /api/*
    ├── vercel.local.json   # Local dev config — routes to localhost ports
    └── vercel.dev.json     # Dev/staging config — routes to deployed Vercel preview URLs
```

## Routing Rules

Defined in `vercel/vercel.local.json` (local) and `vercel/vercel.dev.json` (dev/staging):

- `/api/auth/:path*` → `globifier-auth-be` (NestJS, port 8000)
- `/:path*` → `globifier-auth-fe` (Vite frontend, port 5173)

## Edge Middleware (`vercel/middleware.ts`)

Runs on every `/api/*` request at the edge before it is proxied.

Key behaviour:
- **Strips** the `auth_token` cookie from all outgoing upstream requests (the upstream never sees it directly).
- `/api/auth/login` is **exempt** — passes through without a token check (unauthenticated login route).
- All other `/api/*` routes require an `auth_token` cookie. If missing, returns `403 Access Denied`.
- Extracts the token and forwards it as `Authorization: Bearer <token>` to the upstream service.

When editing middleware:
- Keep the `auth_token` cookie stripping logic intact — the upstream must never receive it raw.
- The `config.matcher` array controls which paths the middleware activates on; keep it scoped to `/api/:path*`.
- Return `new Response("...", { status: ... })` for early exits; use `next({ request: { headers } })` to continue.

## Local Development

```bash
# From globifier-gateway root — starts all three services
npm start

# Or start gateway only
cd vercel && vercel dev --yes --local-config vercel.local.json
```

Ensure `vercel` CLI is installed (`devDependencies`) and you are logged in (`vercel login`).

## Environment / Config Files

There are no `.env` files in this project. Environment-specific routing is handled entirely via the two Vercel config JSON files:
- `vercel.local.json` — used during `npm run globifier` (local dev)
- `vercel.dev.json` — used for deployed dev/preview environments

## Key Conventions

- This project is **not** a NestJS or Express app — it has no server-side runtime beyond Vercel edge functions.
- Do not add runtime Node.js dependencies unless they are edge-runtime compatible (`@vercel/functions` is the approved runtime package).
- Middleware must remain a **default export** function with a named `config` export for the matcher.
- Keep route rewrites in sync between `vercel.local.json` and `vercel.dev.json` when adding new services.
- When adding a new backend service, add its `/api/<service>/:path*` rewrite **before** the catch-all `/:path*` rewrite.
