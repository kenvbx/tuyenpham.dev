# Deployment Target

## Decision

MVP deployment target:

| Component | Target | Reason |
| --- | --- | --- |
| Admin frontend | Vercel | Phu hop React/Vite static SPA, preview deployments tot |
| API backend | Render Web Service | Deploy Node/Express don gian, env/secrets ro, autos deploy tu Git |
| Database/Auth/Storage | Supabase Cloud | Dang la database hien tai, cung cap Auth, Postgres, Storage |
| Database migrations | Supabase CLI | Versioned SQL migrations trong repo |
| Domain/DNS | Custom domain provider + Vercel/Render DNS targets | Linh hoat, khong khoa vao mot nha cung cap |

Day la target mac dinh cho MVP. Neu sau nay can latency tot hon o Viet Nam/Singapore, chi phi khac, hoac infrastructure-as-code nang cao hon, API co the doi tu Render sang Fly.io/Railway/VPS ma khong anh huong admin va database boundary.

## Target Architecture

```txt
Browser
  -> admin.tuyenpham.dev       -> Vercel static React app
  -> api.tuyenpham.dev         -> Render Node/Express API
  -> Supabase Auth             -> login/session/JWT
  -> Supabase Postgres/Storage -> data/media via API
```

Public content delivery:

```txt
Public frontend or consumer
  -> api.tuyenpham.dev/public/*
  -> Supabase Postgres via API
```

Admin management:

```txt
Admin app
  -> Supabase Auth for login/session
  -> Express API with Bearer token
  -> API enforces ACL
  -> API reads/writes Supabase
```

## Environments

Use 3 environments:

| Environment | Purpose | Admin URL | API URL | Supabase Project |
| --- | --- | --- | --- | --- |
| Local | Development | `http://localhost:5173` | `http://localhost:4000` | Local Supabase or dev project |
| Staging | QA/preview | Vercel preview/staging domain | Render staging service | Supabase staging project |
| Production | Real users | `https://admin.tuyenpham.dev` | `https://api.tuyenpham.dev` | Supabase production project |

Rule:

- Staging and production must use separate Supabase projects.
- Production service role key must never be used locally or in staging.
- Preview deployments may point to staging API only.

## Admin Frontend On Vercel

### App

```txt
apps/admin
```

### Build

```txt
pnpm install --frozen-lockfile
pnpm --filter @cms/admin build
```

### Output

```txt
apps/admin/dist
```

### Runtime

Static SPA hosted by Vercel.

### Environment Variables

Only browser-safe variables:

```txt
VITE_API_URL=https://api.tuyenpham.dev
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not add:

```txt
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
```

### Routing

Configure SPA fallback so admin routes such as `/admin/pages/:id/edit` serve the React app.

Recommended file later:

```txt
apps/admin/vercel.json
```

with rewrite to `index.html`.

## API Backend On Render

### App

```txt
apps/api
```

### Service Type

Render Web Service.

### Build

```txt
pnpm install --frozen-lockfile
pnpm --filter @cms/api build
```

### Start

```txt
pnpm --filter @cms/api start
```

### Health Check

```txt
GET /health
```

### Environment Variables

```txt
NODE_ENV=production
PORT=4000
APP_URL=https://api.tuyenpham.dev
ADMIN_URL=https://admin.tuyenpham.dev
CORS_ORIGINS=https://admin.tuyenpham.dev
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
LOG_LEVEL=info
```

Rules:

- Secrets are configured in Render dashboard/env groups, not committed.
- API must fail fast if required env vars are missing.
- `CORS_ORIGINS` must not be `*` in production.
- Render service should use Node LTS.

## Supabase Cloud

### Projects

Use separate projects:

```txt
cms-staging
cms-production
```

### Services Used

| Service | Use |
| --- | --- |
| Auth | Admin login/session |
| Postgres | CMS data |
| Storage | Media files |
| RLS | Defense-in-depth |
| SQL migrations | Schema lifecycle |

### Storage Buckets

Bucket policy will be finalized in `CMS-0007`, but deployment ownership is:

- Staging and production buckets are separate.
- API owns upload/write operations.
- Public media exposure depends on storage policy decision.

## Database Migration Flow

Migrations live in:

```txt
supabase/migrations
supabase/seeds
```

MVP workflow:

```txt
Local development
  -> create SQL migration
  -> run locally or against dev project
  -> review SQL
  -> apply to staging
  -> smoke test
  -> apply to production
```

Commands will be finalized in `CMS-0202`, but target flow uses Supabase CLI because it supports local development, database migrations and deploy workflows.

Production rule:

- Never edit production schema directly in Supabase Dashboard.
- Every schema change must have migration file.
- Migrations should be backward-compatible when possible.

## CI/CD Direction

### Admin

Git push:

```txt
main -> production deploy on Vercel
pull request/branch -> preview deploy on Vercel
```

### API

Git push:

```txt
main -> production deploy on Render
staging branch or manual promotion -> staging deploy
```

### Database

For MVP:

```txt
manual migration promotion via Supabase CLI
```

Later:

```txt
CI job applies migrations to staging automatically
production migration requires manual approval
```

## Domain Plan

| Hostname | Target |
| --- | --- |
| `admin.tuyenpham.dev` | Vercel admin app |
| `api.tuyenpham.dev` | Render API service |
| `www.tuyenpham.dev` | Future public website/frontend |
| `tuyenpham.dev` | Future public website/frontend |

CORS allowlist for production:

```txt
https://admin.tuyenpham.dev
https://www.tuyenpham.dev
https://tuyenpham.dev
```

During MVP admin-only stage, API may allow only admin domain.

## Deployment Checklist

### Admin

| Step | Requirement |
| --- | --- |
| Build command | `pnpm --filter @cms/admin build` |
| Output directory | `apps/admin/dist` |
| Env vars | `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| SPA fallback | All admin routes serve `index.html` |
| Smoke test | Login page loads and calls API health/auth |

### API

| Step | Requirement |
| --- | --- |
| Build command | `pnpm --filter @cms/api build` |
| Start command | `pnpm --filter @cms/api start` |
| Env vars | Server-only Supabase and CORS vars set |
| Health check | `/health` returns ok |
| CORS | Allows admin domain only |
| Logs | Request/error logs visible in Render |

### Supabase

| Step | Requirement |
| --- | --- |
| Projects | Staging and production exist |
| Migrations | Applied in order |
| Seeds | Admin role/permissions seeded |
| RLS | Enabled on CMS tables |
| Storage | Bucket exists |
| Auth | Email/password enabled for admin login |

## Rollback Strategy

### Admin rollback

Use Vercel previous deployment rollback.

Rollback is generally safe because admin is static. If API contract changed, verify compatibility before rollback.

### API rollback

Use Render previous deploy/manual redeploy of previous commit.

Rules:

- Keep API changes backward-compatible with current database where possible.
- Do not deploy API requiring migration before migration is applied.
- If API deploy fails health check, rollback before further database changes.

### Database rollback

Database rollback must be deliberate.

Rules:

- Prefer forward fix migration over destructive rollback.
- Never drop/rename columns in the same release that first stops using them.
- For risky migrations, create backup/export before production apply.
- Schema migration release notes must mention rollback path.

## Observability

MVP minimum:

| Area | Tool/Target |
| --- | --- |
| API logs | Render logs |
| API health | `/health` endpoint |
| API errors | Structured logs, later Sentry |
| Admin deploy status | Vercel deployment checks |
| Database health | Supabase dashboard |
| Audit events | `audit_logs` table |

Post-MVP:

- Sentry for admin/API errors.
- Uptime monitor for `api.tuyenpham.dev/health`.
- Log drain or centralized logs.

## Risks And Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| API cold start or free-tier sleep | Admin/API slow first request | Use paid/always-on service for production |
| Region latency | Slower admin/content API | Choose closest available regions; revisit API host if needed |
| Env mismatch between admin/API | Login/API calls fail | Document env vars, fail fast in API, smoke test deploy |
| Service role key leak | Critical security issue | Server-only env, rotate key if leaked, never expose in Vite |
| Migration drift | Production schema differs from repo | CLI migrations only, no direct dashboard edits |
| CORS too open | Wider attack surface | Explicit allowlist per environment |

## Alternative Targets Considered

| Option | Decision | Reason |
| --- | --- | --- |
| Vercel for both admin and API | Not MVP default | Express long-running API fits Render more simply |
| Railway for API | Acceptable alternative | Good DX, but Render chosen for simple Node web service docs |
| Fly.io for API | Later option | Stronger regional control, more ops complexity |
| VPS for API | Not MVP default | More maintenance, slower MVP |
| Supabase Edge Functions for API | Not MVP default | CMS business API is Express/Node by requirement |

## Acceptance Criteria

`CMS-0005` duoc xem la done khi:

- Admin deployment target da chot.
- API deployment target da chot.
- Supabase/staging/production ownership da chot.
- Env vars cho admin/API da ro.
- Migration deployment direction da ro.
- Rollback/smoke test direction da ro.

## Sources

- Vercel Vite deployment docs: https://vercel.com/docs/frameworks/frontend/vite
- Vercel environment variables docs: https://vercel.com/docs/environment-variables
- Render Node/Express deployment docs: https://render.com/docs/deploy-node-express-app
- Render environment variables docs: https://render.com/docs/configure-environment-variables
- Supabase CLI docs: https://supabase.com/docs/guides/local-development/cli/getting-started
- Supabase database migrations docs: https://supabase.com/docs/guides/deployment/database-migrations

