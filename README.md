# Tuyen Pham CMS

A modular CMS built as a TypeScript monorepo with React/Vite admin, Express API,
shared contracts, Tailwind styling, and Supabase as the current
database/auth/storage platform.

## Workspace

- `apps/admin`: React, TypeScript, Vite admin console.
- `apps/api`: Node.js, Express, TypeScript API.
- `packages/shared`: shared response contracts, constants, schemas, sanitizer.
- `packages/ui`: shared CMS UI primitives.
- `tooling`: migration, seed, QA, release, and operations scripts.
- `supabase`: SQL migrations and seed files.

## Local Setup

1. Install Node.js 22+ and pnpm 9+.
2. Install dependencies:

   ```sh
   pnpm install
   ```

3. Copy env examples:

   ```sh
   cp apps/api/.env.example apps/api/.env
   cp apps/admin/.env.example apps/admin/.env
   ```

4. Fill Supabase values:

   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

5. Validate migrations and seeds:

   ```sh
   pnpm db:migrate -- --dry-run
   pnpm db:seed -- --dry-run
   ```

6. Run the CMS locally:

   ```sh
   pnpm dev
   ```

Default URLs:

- Admin: `http://localhost:5173`
- API: `http://localhost:4000`

## Admin User Guide

Use the admin console for day-to-day content operations:

- Dashboard: review CMS counts and recent page/post changes.
- Pages: create static pages, edit SEO fields, preview HTML, publish, archive, restore revisions.
- Blog: create posts, assign categories/tags, manage related posts, schedule/publish, restore revisions.
- Media: create folders, upload allowed image/PDF files, edit alt text and metadata, trash or hard delete files.
- Menus: create menu locations and nested menu nodes for public navigation.
- Modules: manage galleries, contacts, members, localization, analytics, and module settings.
- Users/Roles: manage profiles, roles, and permission assignment.
- Settings: update general, SEO, appearance, social, captcha, privacy, and integration settings.
- Audit: inspect activity logs, export backup JSON, and generate import plans.

Operational expectations:

- Use descriptive titles and slugs.
- Add alt text for images before publishing.
- Preview pages/posts before publishing.
- Use least-privilege roles; reserve super admin for operations.
- Review audit logs after destructive actions.

## API Documentation

All API responses use the shared contract from `@cms/shared`:

- Success: `{ "data": ... }`
- Lists: `{ "data": [...], "pagination": { "page", "perPage", "total", "pageCount" } }`
- Errors: `{ "error": { "code", "message", "details" } }`

Authentication:

- Admin endpoints require `Authorization: Bearer <supabase_access_token>`.
- Permission-protected endpoints resolve roles and permission flags from Supabase-backed ACL tables.
- Public content endpoints do not require auth.

Core endpoints:

- `GET /health`
- `GET /sitemap.xml`
- `GET /robots.txt`
- `GET /auth/me`
- `PATCH /auth/me`
- `POST /auth/events`
- `GET /admin/dashboard/overview`
- `GET|POST|PATCH|DELETE /admin/pages`
- `GET|POST|PATCH|DELETE /admin/posts`
- `GET|POST|PATCH|DELETE /admin/categories`
- `GET|POST|PATCH|DELETE /admin/tags`
- `GET|POST|PATCH|DELETE /admin/media`
- `POST /admin/media/upload`
- `GET|POST|PATCH|DELETE /admin/menus`
- `GET|POST|PATCH|DELETE /admin/users`
- `GET|POST|PATCH|DELETE /admin/roles`
- `GET|PATCH /admin/settings`
- `GET /admin/system/export`
- `POST /admin/system/import/plan`
- `GET /public/resolve`
- `GET /public/pages/:slug`
- `GET /public/posts`
- `GET /public/posts/:slug`
- `GET /public/categories/:slug`
- `GET /public/tags/:slug`
- `GET /public/menus/:location`
- `GET /public/settings`
- `POST /public/contact`
- `POST /public/members/register`
- `POST /public/analytics/events`

Security controls:

- CORS allowlist via `CORS_ORIGINS`.
- Rate limits on auth, public write forms, analytics events, and uploads.
- Security headers on all API responses.
- Shared HTML sanitization before page/post writes.
- Media MIME, extension, signature, and size validation.

## Database Schema

Primary foundation tables:

- Identity and ACL: `profiles`, `roles`, `permissions`, `role_permissions`, `user_roles`.
- Content: `pages`, `posts`, `categories`, `tags`, `post_categories`, `post_tags`, `post_related_posts`.
- Routing and SEO: `slugs`, `seo_meta`.
- Media: `media_folders`, `media_files`, Supabase `cms-media` bucket.
- Navigation: `menus`, `menu_nodes`.
- Operations: `audit_logs`, `revisions`, `admin_notifications`.
- Extensions: `galleries`, `gallery_items`, `contact_submissions`, `members`, localization, analytics tables.
- Settings: namespace/key settings for site, SEO, appearance, privacy, captcha, social, and integrations.

Query indexes cover public slug resolution, published content lists, author/status filters,
admin status lists, media status lists, audit entity history, taxonomy, and SEO lookups.
Migrations are ordered in `supabase/migrations`; seeds live in `supabase/seeds`.

## Deployment Runbook

Required runtime configuration:

- API: `NODE_ENV=production`, `PORT`, `APP_URL`, `ADMIN_URL`, `CORS_ORIGINS`,
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  optional `DATABASE_URL`, optional `ERROR_MONITORING_DSN`, `LOG_LEVEL`.
- Admin: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

Release steps:

1. Run the full verification command:

   ```sh
   pnpm lint && pnpm db:migrate -- --dry-run && pnpm db:seed -- --dry-run && pnpm typecheck && pnpm test && pnpm build && pnpm perf:budget && pnpm format:check
   ```

2. Apply migrations in the target environment:

   ```sh
   pnpm db:migrate
   ```

3. Apply production seeds if needed:

   ```sh
   pnpm db:seed
   ```

4. Seed or verify the first production admin:

   ```sh
   PROD_ADMIN_EMAIL=admin@example.com PROD_ADMIN_PASSWORD='change-me-long-password' pnpm admin:seed-production
   ```

5. Deploy API and admin artifacts.
6. Check `GET /health`, admin login, content list pages, public resolver, sitemap, and audit logs.

Rollback:

- Roll back application artifacts first.
- Restore database from the last verified Supabase backup if a migration/data issue is confirmed.
- Keep failed release notes and triage issues linked to the commit SHA.

## QA Checklist

Run the scripted checklist before release:

```sh
pnpm qa:checklist
```

Minimum manual QA:

- Login/logout and current profile load.
- Pages create/edit/preview/publish/delete/restore revision.
- Posts create/edit/category/tag/related post/publish/delete/restore revision.
- Media folder create/edit/delete and upload rejection for invalid file types.
- Menu location and nested node editing.
- User, role, and permission gating.
- Settings save for general, SEO, appearance, captcha, privacy, and social namespaces.
- Public resolver, page, post list/detail, category, tag, menu, settings, sitemap, robots.
- Public contact, member registration, and analytics events rate-limit behavior.
- Keyboard navigation through sidebar, modals, drawers, forms, and destructive confirmations.

## Bug Triage

Use GitHub issues with the bug report template. Triage fields:

- Severity: `S0` outage/security, `S1` core flow broken, `S2` degraded workflow, `S3` polish.
- Area: admin, API, database, auth, media, public, deployment.
- Reproduction steps and expected/actual behavior.
- Release SHA and environment.

Triage cadence:

- New issues are reviewed before the next release batch.
- `S0` and `S1` issues block release.
- Every fix should include a regression test or a clear verification note.
