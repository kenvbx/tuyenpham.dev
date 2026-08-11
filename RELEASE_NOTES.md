# Release Notes

## v0.1.0

Initial CMS release candidate.

Included:

- React/Vite admin shell with dashboard, auth, permission-aware navigation, shared UI components, tables, forms, drawers, modals, and validation summaries.
- Supabase Auth integration with profiles, roles, permissions, user roles, and protected admin APIs.
- Page, blog, media, menu, settings, SEO, audit, revision, user, role, and public content APIs.
- Optional extension modules for galleries, contacts, members, localization, analytics, privacy, captcha, and social settings.
- Public routing, sitemap, robots, caching, public settings, contact/member/analytics endpoints.
- Security hardening: CORS allowlist, rate limiting, security headers, HTML sanitization, upload MIME/signature/size checks.
- Release tooling: migrations, seeds, backup drill, QA checklist, production admin seed, and performance budget.

Known limits:

- Production admin creation requires a valid Supabase service role key and secure password handling.
- Backup drill validates coverage and environment readiness; full restore execution should happen in staging before production cutover.
- Public frontend rendering is API-ready but outside this admin/API release scope.
