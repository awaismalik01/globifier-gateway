# Globifier Gateway

## Overview

`globifier-gateway` is the edge entry point for the Globifier platform. It is a Vercel-deployed reverse proxy that routes traffic to backend and frontend services, while enforcing authentication at the edge via middleware.

It has no server-side runtime beyond Vercel edge functions. The project contains only routing configuration and edge middleware — no build step, no application framework.

## Architecture

The gateway sits in front of these services:

| Project | Role | Local Port |
|---------|------|------------|
| `globifier-gateway` | Vercel edge gateway / reverse proxy | 3000 (vercel dev) |
| `globifier-auth-be` | NestJS auth + user API | 8080 |
| `globifier-auth-fe` | Frontend (Vite/React, separate repo) | 5173 |

## Repository Structure

```
globifier-gateway/
├── .github/
│   └── workflows/
│       └── dev.yaml            # CI/CD — fetches Infisical secrets, resolves vercel.json, deploys
├── middleware.ts               # Vercel edge middleware — auth enforcement on /api/*
├── vercel.json                 # Routing config template — uses ${VAR} placeholders for URLs
├── vercel/
│   ├── .env.local              # Local environment variables (git-ignored)
│   ├── .gitignore              # Ignores local-only vercel files
│   └── vercel.local.json       # Local dev config — hardcoded localhost URLs
├── package.json                # Dev dependency (vercel CLI), runtime dep (@vercel/functions), start script
└── .gitignore
```

## Routing Rules

Defined in `vercel.json` (deployed environments) and `vercel/vercel.local.json` (local dev):

| Pattern | Destination |
|---------|-------------|
| `/api/auth/:path*` | `globifier-auth-be` |
| `/` | `globifier-auth-fe` |
| `/:path*` | `globifier-auth-fe` (catch-all) |

### Environment-specific URLs

`vercel.json` at root uses placeholder variables (`${GLOBIFIER_AUTH_BE_URL}`, `${GLOBIFIER_AUTH_FE_URL}`) that are resolved at deploy time via `envsubst`. The actual URLs come from Infisical secrets.

`vercel/vercel.local.json` uses hardcoded `localhost` URLs for local development.

Both config files set `"framework": null` and `"buildCommand": ""` to signal that no build step exists.

## Edge Middleware (`middleware.ts`)

Located at the **project root** (required by Vercel's middleware convention). Runs on every `/api/*` request at the edge before it is proxied.

Key behaviour:
- **Strips** the `auth_token` cookie from all outgoing upstream requests — the upstream never sees it raw.
- `/api/auth/login` is **exempt** — passes through without a token check.
- All other `/api/*` routes require an `auth_token` cookie. If missing, returns `403 Access Denied`.
- Extracts the token and forwards it as `Authorization: Bearer <token>` to the upstream service.

When editing middleware:
- Keep the `auth_token` cookie stripping logic intact.
- The `config.matcher` array controls which paths the middleware activates on; keep it scoped to `/api/:path*`.
- Return `new Response("...", { status: ... })` for early exits; use `next({ request: { headers } })` to continue.
- Import `next` from `@vercel/functions`.

## Local Development

```bash
# Start the gateway (requires vercel CLI login)
npm start
```

This runs `vercel dev` with `vercel/vercel.local.json` which routes to `localhost:8080` (auth-be) and `localhost:5173` (auth-fe). Start those services separately in their own repos.

## CI/CD (`.github/workflows/dev.yaml`)

Triggered on push to any branch except `main`, or manually via `workflow_dispatch`.

Steps:
1. Checkout code
2. Fetch secrets from Infisical (OIDC auth via `INFISICAL_MACHINE_ID`)
3. Resolve `${GLOBIFIER_AUTH_BE_URL}` and `${GLOBIFIER_AUTH_FE_URL}` in `vercel.json` using `envsubst`
4. Install Vercel CLI
5. Deploy to Vercel (preview) using `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `INFISICAL_MACHINE_ID` | Infisical Machine Identity ID (OIDC auth) |
| `INFISICAL_PROJECT_SLUG` | Infisical project slug for this gateway |
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel team/org ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

### Required Infisical Secrets (dev environment)

| Key | Example |
|-----|---------|
| `GLOBIFIER_AUTH_BE_URL` | `https://globifier-auth-be-dev.vercel.app` |
| `GLOBIFIER_AUTH_FE_URL` | `https://globifier-auth-fe-dev.vercel.app` |

## Key Conventions

- This project is **not** a NestJS or Express app — no server-side runtime beyond Vercel edge functions.
- Do not add runtime Node.js dependencies unless they are edge-runtime compatible (`@vercel/functions` is the approved runtime package).
- Middleware must remain a **default export** function with a named `config` export for the matcher.
- Middleware lives at the **project root** (`middleware.ts`) — not inside `vercel/`.
- When adding a new backend service, add its `/api/<service>/:path*` rewrite **before** the catch-all `/:path*` rewrite.
- Keep `vercel.json` and `vercel/vercel.local.json` in sync structurally when adding new routes.
- Never hardcode environment-specific URLs in `vercel.json` — use `${VAR}` placeholders resolved via Infisical at deploy time.
- `git.deploymentEnabled: false` in `vercel.json` — deployments are CI-driven, not triggered by Vercel's git integration.
- `.gitignore` excludes `.vercel/`, `node_modules/`, and `.env*` files.

## Agent Workflow Rules

- **Never run build or compile commands** — there is no build step for this project.
- **Never run the dev server** (`npm start`, `vercel dev`) — the user starts it themselves.
- Focus on writing correct configuration and middleware code.
