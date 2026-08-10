# Monorepo Architecture Decision

## Decision

Dung monorepo TypeScript voi 2 app chinh va 2 package dung chung:

```txt
tuyenpham.dev/
  apps/
    admin/
    api/
  packages/
    shared/
    ui/
  docs/
  supabase/
    migrations/
    seeds/
  tooling/
```

Kien truc nay phu hop MVP CMS vi can chia ro admin frontend, API backend, shared contract va UI primitives. No giu duoc tinh module-first cua Botble, nhung tranh over-engineering plugin runtime qua som.

## Workspace Layout

| Path | Purpose | Build Target | Notes |
| --- | --- | --- | --- |
| `apps/admin` | React admin dashboard | Browser SPA | React + TypeScript + Vite + Tailwind |
| `apps/api` | Express API server | Node.js runtime | Express + TypeScript, ket noi Supabase |
| `packages/shared` | Shared constants, types, schemas | ESM package | Zod schemas, permission flags, API contracts |
| `packages/ui` | Shared UI components | React package | Tailwind + Tabler icons, dung cho admin |
| `docs` | Architecture/product docs | Markdown | Source of decisions |
| `supabase/migrations` | SQL migrations | Supabase/Postgres | Versioned SQL |
| `supabase/seeds` | Seed scripts/data | Supabase/Postgres | Permissions, admin role, sample data |
| `tooling` | Repo scripts/config helpers | Node scripts | Generation, validation, maintenance |

## Package Manager

Chon `pnpm` workspaces.

Ly do:

- Ho tro monorepo tot, workspace protocol ro rang.
- Cai dat nhanh va tiet kiem dung luong.
- Phu hop TypeScript package linking giua `apps/*` va `packages/*`.
- Tranh dependency duplication khi admin/API/shared cung dung chung schema/types.

Root workspace:

```txt
package.json
pnpm-workspace.yaml
tsconfig.base.json
eslint.config.js
prettier.config.js
```

## Root Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Chay admin va API song song |
| `pnpm dev:admin` | Chay Vite admin |
| `pnpm dev:api` | Chay Express API watch mode |
| `pnpm build` | Build tat ca workspace |
| `pnpm build:admin` | Build admin |
| `pnpm build:api` | Build API |
| `pnpm lint` | Lint tat ca workspace |
| `pnpm typecheck` | TypeScript check tat ca workspace |
| `pnpm test` | Chay tests |
| `pnpm format` | Format code |
| `pnpm db:migrate` | Apply Supabase migrations |
| `pnpm db:seed` | Seed permissions/admin defaults |

## Dependency Direction

Allowed dependencies:

```txt
apps/admin -> packages/ui
apps/admin -> packages/shared
apps/api   -> packages/shared
packages/ui -> packages/shared
```

Not allowed:

```txt
packages/shared -> apps/*
packages/shared -> packages/ui
apps/api -> packages/ui
apps/admin -> apps/api internals
```

Admin chi goi API qua HTTP client/contracts, khong import code backend.

## App Boundaries

### `apps/admin`

Responsibilities:

- Admin routing/layout.
- Auth UI va session state.
- Data fetching/caching.
- Forms, tables, editor, media picker.
- Permission-based UI visibility.

Should not:

- Chua Supabase service role key.
- Tu quyet dinh permission truth.
- Query database truc tiep bang service role.
- Chua business logic backend.

### `apps/api`

Responsibilities:

- Verify Supabase Auth JWT.
- Enforce roles/permissions server-side.
- Business logic cho content/media/menu/settings.
- Write audit logs/revisions.
- Public content resolver.
- Supabase admin/service role operations.

Should not:

- Return private settings/secrets.
- Trust frontend permission checks.
- Mix UI rendering concerns.

### `packages/shared`

Responsibilities:

- Permission constants.
- Entity status constants.
- API request/response types.
- Zod validation schemas.
- Shared utility types.
- Route path constants neu can.

Should not:

- Import React.
- Import Express.
- Import Supabase client configured voi env.
- Chua runtime side effects.

### `packages/ui`

Responsibilities:

- Button, Input, Select, Switch, Dialog, Drawer.
- DataTable base pieces.
- Empty/loading/error states.
- Layout primitives.
- Icon wrapper around `@tabler/icons-react`.

Should not:

- Fetch API.
- Know CMS business modules.
- Store auth/session state.

## Module Pattern

Moi domain module trong admin/API nen di theo cung pattern.

API:

```txt
apps/api/src/modules/pages/
  pages.routes.ts
  pages.controller.ts
  pages.service.ts
  pages.repository.ts
  pages.schemas.ts
  pages.permissions.ts
  pages.types.ts
```

Admin:

```txt
apps/admin/src/modules/pages/
  pages.routes.tsx
  pages.api.ts
  pages.queries.ts
  pages.permissions.ts
  pages.types.ts
  components/
  pages/
```

Shared:

```txt
packages/shared/src/modules/pages/
  pages.constants.ts
  pages.schemas.ts
  pages.types.ts
```

Giai doan MVP co the dat schemas/types trong `packages/shared/src/modules/*`, API/admin import lai de tranh lech contract.

## Route Strategy

### Admin Routes

Admin la SPA route:

```txt
/login
/admin
/admin/pages
/admin/pages/new
/admin/pages/:id/edit
/admin/blog/posts
/admin/media
/admin/menus
/admin/system/users
/admin/system/roles
/admin/settings/general
```

### API Routes

API routes chia 3 group:

| Group | Prefix | Auth | Purpose |
| --- | --- | --- | --- |
| Health | `/health` | No | Runtime check |
| Admin | `/admin/*` | Yes | CMS management |
| Public | `/public/*` | No/optional | Read published content |

Admin routes bat buoc qua `requireAuth` va `requirePermission`.

## Environment Ownership

### Root

Root `.env.example` chi nen document bien chung. Moi app co env rieng.

### `apps/admin`

Only public browser-safe vars:

```txt
VITE_API_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### `apps/api`

Server-only vars:

```txt
NODE_ENV=
PORT=
APP_URL=
ADMIN_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
CORS_ORIGINS=
```

Rule: `SUPABASE_SERVICE_ROLE_KEY` khong bao gio xuat hien trong `apps/admin`.

## Database And Supabase Layout

```txt
supabase/
  migrations/
    000001_auth_acl.sql
    000002_settings.sql
    000003_media.sql
    000004_content.sql
    000005_menus.sql
    000006_audit_revisions.sql
  seeds/
    permissions.sql
    admin_role.sql
    sample_content.sql
```

Migrations uu tien SQL ro rang de Supabase dashboard/CLI deu doc duoc. API khong tu dong tao schema khi start app.

## Testing Strategy

| Layer | Tooling Direction | Scope |
| --- | --- | --- |
| Shared | Vitest | Schema/constants utility tests |
| API unit | Vitest | Services, permission resolver, slug service |
| API integration | Supertest/Vitest | Route auth/permission/content flows |
| Admin unit | Vitest + React Testing Library | Components/hooks |
| Admin e2e smoke | Playwright | Login, create page/post/media/menu |

MVP bat buoc co typecheck/lint/build. Test coverage tang dan tu permission va slug flows truoc.

## Build And Output

| Workspace | Source | Output |
| --- | --- | --- |
| `apps/admin` | `src` | `dist` |
| `apps/api` | `src` | `dist` |
| `packages/shared` | `src` | `dist` |
| `packages/ui` | `src` | `dist` |

Build order:

```txt
packages/shared -> packages/ui -> apps/api/apps/admin
```

## Recommended Initial Dependencies

### Root

```txt
typescript
eslint
prettier
tsx
vitest
```

### Admin

```txt
@vitejs/plugin-react
vite
react
react-dom
react-router-dom
@tanstack/react-query
react-hook-form
@hookform/resolvers
zod
tailwindcss
@tabler/icons-react
```

### API

```txt
express
cors
helmet
zod
@supabase/supabase-js
pino
pino-http
multer
```

### UI

```txt
react
@tabler/icons-react
class-variance-authority
clsx
tailwind-merge
```

## Architecture Acceptance Criteria

`CMS-0002` duoc xem la done khi:

- Co quyet dinh chinh thuc ve folders `/apps/admin`, `/apps/api`, `/packages/shared`, `/packages/ui`.
- Co dependency direction va ownership rule.
- Co route/API/database layout de scaffold tiep.
- Co package manager va root scripts target.
- `CMS-0101` co the bat dau scaffold workspace.

## Follow-Up Tasks Unblocked

| Task | Why Unblocked |
| --- | --- |
| `CMS-0003` | Naming convention co the dua vao structure nay |
| `CMS-0005` | Deployment target co the dua vao app boundaries |
| `CMS-0101` | Da co folder/workspace/script decision |
| `CMS-0102` | Da biet admin app stack va boundaries |
| `CMS-0103` | Da biet API app stack va boundaries |
| `CMS-0104` | Da biet shared package responsibility |
| `CMS-0105` | Da biet UI package responsibility |

