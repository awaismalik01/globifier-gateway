# Globifier Gateway

Edge reverse proxy for the Globifier platform. Routes all traffic to backend and frontend services, and enforces JWT authentication at the Vercel edge.

---

## What is Globifier?

Globifier is an internal developer platform that automates end-to-end project setup and user management. Instead of manually creating repos, configuring deployments, provisioning databases, and wiring up secrets — Globifier does it all in one click.

A single provisioning request creates:
- A GitHub repository (from a template)
- A Vercel project (linked and deployed)
- A Neon PostgreSQL database (with DDL and DML roles)
- An Infisical secrets project (with environment variables pre-populated)
- GitHub Actions secrets (for CI/CD pipelines)
- A notification email to the developer

Beyond provisioning, Globifier provides:

- **Globo Desk** — An admin console for managing users, roles, and NHID service clients across the platform. Create accounts, assign permissions, and generate machine-to-machine tokens from a single UI.
- **Globo Forge** — Self-service project provisioning. Developers can spin up fully configured projects without waiting on ops or manual setup.
- **Multi-service dashboard** — A unified interface that aggregates all Globifier services (Forge, Desk, Blogs, etc.) under one roof, with role-based visibility so admins and users each see what's relevant to them.

The platform is designed around self-provisioning — teams can onboard services, manage access, and scale independently without bottlenecks.

---

## Gateway

The gateway is the single entry point for all Globifier traffic. It runs at the Vercel edge and handles routing + authentication before requests reach any backend or frontend service.

```
                         ┌───────────────────────┐
                         │   Globifier Gateway   │
                         │   (Vercel Edge)       │
                         └───────────┬───────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
 Auth Backend (NestJS)      Forge Backend (NestJS)       Frontend SPAs (React)
 /api/auth/*                /api/forge/*                 / and /forge/*
```

---

## Repositories

| Repository | Description | Visibility |
|------------|-------------|------------|
| [globifier-gateway](https://github.com/awaismalik01/globifier-gateway) | Edge proxy + auth middleware (this repo) | Public |
| `globifier-auth-be` | Authentication, user/role management, NHID service tokens | Private |
| `globifier-auth-fe` | Login, account settings, dashboard | Private |
| `globifier-forge-be` | Automated provisioning (GitHub, Vercel, Neon, Infisical, Brevo) | Private |
| `globifier-forge-fe` | Provisioning UI, templates, status tracking | Private |
| [github-actions](https://github.com/awaismalik01/github-actions) | Reusable CI/CD composite actions | Public |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Gateway | Vercel Edge Functions, `jose` (JWT), `@vercel/functions` |
| Backends | NestJS 11, TypeORM, PostgreSQL (Neon) |
| Frontends | React 18, Vite 5, Tailwind CSS 3, React Router v6 |
| Database | PostgreSQL on [Neon](https://neon.tech) |
| Secrets | [Infisical](https://infisical.com) |
| Email | [Brevo](https://brevo.com) |
| Hosting | [Vercel](https://vercel.com) (all services) |
| CI/CD | GitHub Actions |

---

## Routing

| Pattern | Service |
|---------|---------|
| `/api/auth/:path*` | Auth Backend |
| `/api/forge/:path*` | Forge Backend |
| `/forge/:path*` | Forge Frontend |
| `/` and `/:path*` | Auth Frontend |

---

## How Auth Works

1. User logs in via `POST /api/auth/login` — backend sets an `auth_token` httpOnly cookie
2. On subsequent requests, the gateway middleware extracts the cookie, verifies the JWT (HS256), and forwards it as `Authorization: Bearer` to the upstream service
3. Exempt routes (login, forgot-password, reset-password) pass through without a token

---

## Local Development

Start the backend and frontend services first, then run the gateway:

```bash
npm install
npm start        # runs vercel dev on port 3000
```

| Service | Port |
|---------|------|
| Gateway | 3000 |
| Auth Backend | 8080 |
| Forge Backend | 8081 |
| Auth Frontend | 5173 |
| Forge Frontend | 5174 |

---

## Deployment

Deployed to Vercel via GitHub Actions. The CI pipeline fetches secrets from Infisical, resolves URL placeholders in `vercel.json`, and deploys.

| Branch | Target |
|--------|--------|
| Any non-main | Vercel Preview |
| `main` | Vercel Production |

---

## License

[Apache License 2.0](LICENSE)
