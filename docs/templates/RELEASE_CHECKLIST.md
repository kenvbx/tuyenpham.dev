# Release Checklist

## Release Info

| Field | Value |
| --- | --- |
| Version | `v0.1.0` |
| Date | `YYYY-MM-DD` |
| Environment | staging/production |
| Release Owner | |
| Commit/Tag | |

## Scope

Included:

- Item 1
- Item 2

Excluded:

- Item 1
- Item 2

## Pre-Release Checks

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Database migrations reviewed
- [ ] Seed changes reviewed
- [ ] Env vars verified
- [ ] Security-sensitive changes reviewed
- [ ] Release notes drafted

## Migration Plan

1. Apply migrations to staging.
2. Run staging smoke tests.
3. Apply migrations to production.
4. Deploy API.
5. Deploy admin.
6. Run production smoke tests.

## Smoke Tests

- [ ] Admin login works
- [ ] `/health` returns ok
- [ ] Current user/permissions load
- [ ] Page create/edit/publish works
- [ ] Blog post create/edit/publish works
- [ ] Media upload/select works
- [ ] Menu tree loads
- [ ] Public resolver works

## Rollback Plan

| Area | Rollback |
| --- | --- |
| Admin | Revert Vercel deployment |
| API | Redeploy previous Render version |
| Database | Prefer forward fix migration; use backup only if necessary |

## Post-Release

- [ ] Monitor API logs
- [ ] Monitor admin errors
- [ ] Verify audit logs
- [ ] Confirm key user flows
- [ ] Triage bugs

