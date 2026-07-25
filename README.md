# Globifier Gateway

Edge reverse proxy for the Globifier platform. Routes traffic to backend and frontend services and enforces authentication at the Vercel edge.

## How It Works

- **Routing**: `vercel.json` defines URL rewrites that proxy requests to the appropriate upstream service.
- **Auth enforcement**: Edge middleware (`vercel/middleware.ts`) intercepts all `/api/*` requests, extracts the `auth_token` cookie, and forwards it as a `Bearer` token to the backend. Unauthenticated requests (except `/api/auth/login`) receive a `403`.

## Project Structure

```
├── vercel.json                 # Routing config (env var placeholders, resolved at deploy time)
├── vercel/
│   ├── middleware.ts           # Edge middleware — auth token extraction
│   └── vercel.local.json       # Local dev routing (hardcoded localhost URLs)
├── .github/workflows/
│   └── dev.yaml                # CI/CD — Infisical secrets → envsubst → Vercel deploy
└── package.json                # Local dev: vercel CLI + start script
```

## Routing

| Pattern | Upstream |
|---------|----------|
| `/api/auth/:path*` | Auth backend (NestJS) |
| `/:path*` | Auth frontend (React) |

Upstream URLs are environment-specific:
- **Local**: hardcoded in `vercel/vercel.local.json` (`localhost:8000`, `localhost:5173`)
- **Deployed**: resolved from Infisical secrets (`GLOBIFIER_AUTH_BE_URL`, `GLOBIFIER_AUTH_FE_URL`) via `envsubst` in CI

## Local Development

Prerequisites: [Vercel CLI](https://vercel.com/docs/cli) installed and authenticated.

```bash
npm start
```

This runs `vercel dev` with the local config. Start `globifier-auth-be` (port 8000) and `globifier-auth-fe` (port 5173) separately.

## Deployment

CI/CD is handled by `.github/workflows/dev.yaml`:

1. Fetches secrets from Infisical (OIDC auth)
2. Substitutes `${GLOBIFIER_AUTH_BE_URL}` and `${GLOBIFIER_AUTH_FE_URL}` in `vercel.json`
3. Deploys to Vercel (preview)

Triggered on push to any branch except `main`.

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `INFISICAL_MACHINE_ID` | Infisical Machine Identity ID (OIDC) |
| `INFISICAL_PROJECT_SLUG` | Infisical project slug |
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel team/org ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

### Required Infisical Secrets

| Key | Example |
|-----|---------|
| `GLOBIFIER_AUTH_BE_URL` | `https://globifier-auth-be-dev.vercel.app` |
| `GLOBIFIER_AUTH_FE_URL` | `https://globifier-auth-fe-dev.vercel.app` |
