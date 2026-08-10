# Supabase Auth Strategy

## Decision

Dung Supabase Auth lam identity provider, nhung authorization cua CMS se do API Express quan ly bang custom ACL tables.

He thong se co 3 lop bao ve:

1. Supabase Auth xac thuc user va cap JWT.
2. Express API verify JWT, load profile/roles/permissions, enforce permission middleware.
3. Supabase/Postgres RLS va grants lam defense-in-depth cho database/storage access.

Frontend admin chi dung Supabase anon key va user session. Backend API moi duoc giu service/secret key.

## Why This Approach

Botble co ACL rieng voi users, roles va permission flags. CMS moi cung can authorization chi tiet nhu:

- `pages.create`
- `pages.publish`
- `blog-posts.edit`
- `media.upload`
- `roles.edit`
- `settings.general`

Supabase Auth xu ly authentication tot, nhung CMS permission model can linh hoat hon RLS-only. Vi vay server API la source of truth cho CMS permissions.

## Responsibilities

| Layer | Responsibility | Notes |
| --- | --- | --- |
| Supabase Auth | Identity, session, JWT, password reset/invite | Khong chua CMS permission logic chinh |
| `profiles` table | CMS profile metadata | Mirror `auth.users.id` trong public schema |
| ACL tables | Roles, permissions, user-role mapping | Do API doc va enforce |
| Express API | Verify JWT, enforce permission, audit | Server source of truth |
| RLS policies | Defense-in-depth for exposed tables | Khong thay the API permissions |
| Admin frontend | Login UI, session state, UI guards | UI guard chi de UX, khong phai security boundary |

## Auth Flow

```txt
Admin browser
  -> Supabase Auth signInWithPassword/signOut/getSession
  -> receives access token
  -> calls Express API with Authorization: Bearer <access_token>
  -> API verifies token with Supabase
  -> API loads profile + roles + permissions
  -> API enforces route permission
  -> API performs Supabase DB/Storage operation
```

## User And Profile Model

Supabase stores auth users in `auth.users`. CMS stores public/admin profile data in `public.profiles`.

```txt
auth.users
  id
  email
  encrypted_password
  auth metadata

public.profiles
  id uuid primary key references auth.users(id) on delete cascade
  email text
  first_name text
  last_name text
  display_name text
  avatar_id uuid null references media_files(id)
  status text
  last_login_at timestamptz null
  created_at timestamptz
  updated_at timestamptz
```

Rule:

- Never query `auth.users` from browser code.
- API may use Supabase admin APIs/service key for user management.
- `profiles` is the CMS-facing user table.

## ACL Data Model

```txt
roles
  id uuid primary key
  slug text unique
  name text
  description text null
  is_system boolean
  is_default boolean
  created_at timestamptz
  updated_at timestamptz

permissions
  id uuid primary key
  flag text unique
  name text
  group_name text
  description text null
  created_at timestamptz

role_permissions
  role_id uuid references roles(id) on delete cascade
  permission_id uuid references permissions(id) on delete cascade
  primary key (role_id, permission_id)

user_roles
  user_id uuid references profiles(id) on delete cascade
  role_id uuid references roles(id) on delete cascade
  primary key (user_id, role_id)
```

## Permission Resolution

Permission resolution happens in API middleware.

Algorithm:

1. Read bearer token.
2. Verify token and get `user.id`.
3. Load `profiles` row by `user.id`.
4. Reject if profile status is not `active`.
5. Load roles through `user_roles`.
6. Load permission flags through `role_permissions`.
7. Cache permissions per request.
8. Enforce `requirePermission("resource.action")`.

Super admin option:

- Use `roles.slug = "super-admin"` as a system role.
- Super admin bypasses permission flag lookup inside API only.
- Still must be authenticated and active.

## Middleware Naming

```txt
requireAuth
requirePermission
requireAnyPermission
requireSuperAdmin
attachCurrentUser
```

Request context shape:

```ts
type CurrentUser = {
  id: string;
  email: string;
  profileId: string;
  displayName: string | null;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
};
```

## JWT Verification Strategy

MVP approach:

- API receives Supabase access token from `Authorization` header.
- API verifies token server-side before trusting claims.
- API checks token expiration on every request.
- API does not trust role/permission claims from client for CMS authorization.

Implementation options:

| Option | Use | Notes |
| --- | --- | --- |
| Supabase client `auth.getUser(token)` | MVP default | Simple and lets Supabase validate token |
| Local JWT verification with JWKS/signing keys | Later optimization | Useful to reduce auth round trips |

MVP chooses `auth.getUser(token)` for correctness and speed of implementation. If latency becomes an issue, add local JWT verification later.

## Custom JWT Claims

Do not put full CMS permissions into JWT for MVP.

Reason:

- Permissions can change while token is still valid.
- CMS needs server-side audit and fresh authorization.
- RLS custom claims are useful, but API remains the main enforcement point.

Possible later improvement:

- Add coarse `user_role` custom claim for RLS optimization.
- Keep detailed permission checks in Express.

## API Permission Pattern

```txt
GET    /admin/pages              -> pages.index
POST   /admin/pages              -> pages.create
GET    /admin/pages/:pageId      -> pages.index
PATCH  /admin/pages/:pageId      -> pages.edit
DELETE /admin/pages/:pageId      -> pages.delete
POST   /admin/pages/:pageId/publish -> pages.publish

GET    /admin/roles              -> roles.index
POST   /admin/roles              -> roles.create
PATCH  /admin/roles/:roleId      -> roles.edit
DELETE /admin/roles/:roleId      -> roles.delete
```

Public API:

- Reads only published/safe content.
- Does not require user auth for published content.
- Must never expose draft/private/deleted content.
- Preview endpoints require auth and signed preview token/session.

## Frontend Auth Strategy

Admin app uses:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_API_URL
```

Frontend responsibilities:

- Login/logout.
- Store current session via Supabase client.
- Send `Authorization: Bearer <access_token>` to API.
- Fetch `/auth/me` or `/admin/me` for profile/roles/permissions.
- Hide/disable UI actions by permission.
- Refresh current user after role/profile changes.

Frontend must not:

- Store service role key.
- Make admin database writes directly.
- Treat hidden buttons as security.

## Backend Auth Strategy

API uses:

```txt
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
```

Backend responsibilities:

- Verify bearer token.
- Load profile/permissions.
- Use service role key only on server.
- Execute admin DB/storage operations.
- Write audit logs for auth/ACL-sensitive actions.
- Return consistent `401` and `403` errors.

Error semantics:

| Case | HTTP Status | Error Code |
| --- | --- | --- |
| Missing token | `401` | `AUTH_REQUIRED` |
| Invalid/expired token | `401` | `AUTH_INVALID` |
| Inactive profile | `403` | `ACCOUNT_INACTIVE` |
| Missing permission | `403` | `PERMISSION_DENIED` |
| Super admin required | `403` | `SUPER_ADMIN_REQUIRED` |

## RLS Strategy

Enable RLS for all CMS tables in exposed schemas.

MVP policy direction:

- `profiles`: users can read/update safe own profile fields; API can manage all.
- ACL tables: direct browser access denied or read-limited; API manages.
- Content tables: public read only published rows if exposed; admin writes through API.
- Media metadata: public read only safe fields for published assets; admin writes through API.
- Audit logs: admin/API only, no public access.

Important rule:

- RLS is defense-in-depth.
- API permission middleware is the main CMS authorization layer.
- Service/secret key bypasses RLS, so API code must enforce permissions before using it.

## Storage Strategy

Storage access for MVP:

- Admin upload goes through API.
- API validates file type/size, then uploads to Supabase Storage.
- API creates `media_files` record.
- Public files can be served from a public bucket or signed URL strategy depending on `CMS-0007`.

Do not let browser upload with elevated credentials in MVP.

## Initial Roles

| Role | Purpose |
| --- | --- |
| `super-admin` | Full CMS access, system role |
| `admin` | Most content/system access except destructive system-level operations |
| `editor` | Pages, posts, media, menus |
| `author` | Own posts/media, limited publishing if configured |
| `viewer` | Read-only admin access |

MVP seed must include:

- All permission flags.
- `super-admin` role with all permissions.
- First admin user assigned to `super-admin`.

## Audit Requirements

Write audit logs for:

- Login success/failure if available from API flow.
- Profile status changes.
- Role create/update/delete.
- User role assignment changes.
- Permission changes.
- Password reset/invite triggered by admin.
- User disabled/deleted.

Audit record should include:

```txt
actor_id
action
entity_type
entity_id
before
after
ip_address
user_agent
created_at
```

## Security Rules

- Never expose service/secret key to frontend.
- Always validate JWT before trusting claims.
- Always check token expiration.
- Always enforce permission on server.
- Always enable RLS for exposed tables.
- Keep auth schema access server-only.
- Use HTTPS in production.
- Rotate keys if leaked.
- Use least-privilege RLS/grants where possible.
- Do not put sensitive secrets in `settings`.

## Implementation Checklist

| Task | Requirement |
| --- | --- |
| `CMS-0203` | Create `profiles` referencing `auth.users` |
| `CMS-0204` | Create `roles` |
| `CMS-0205` | Create `permissions` |
| `CMS-0206` | Create `role_permissions` |
| `CMS-0207` | Create `user_roles` |
| `CMS-0225` | Add RLS policies |
| `CMS-0226` | Seed permission flags |
| `CMS-0227` | Seed admin/super-admin role |
| `CMS-0301` | Implement Supabase auth client backend |
| `CMS-0302` | Implement `requireAuth` |
| `CMS-0303` | Implement permission resolver |
| `CMS-0304` | Implement `requirePermission` |
| `CMS-0311` | Build login page |
| `CMS-0312` | Build auth store |
| `CMS-0314` | Build frontend permission guard |

## Acceptance Criteria

`CMS-0004` duoc xem la done khi:

- Supabase Auth duoc chot lam identity provider.
- Custom ACL tables duoc chot cho CMS authorization.
- Token verification va middleware strategy da ro.
- Frontend/backend env boundary da ro.
- RLS va service role usage da ro.
- Cac task database/auth tiep theo co the implement theo tai lieu nay.

## Sources

- Supabase Auth overview: https://supabase.com/docs/guides/auth
- Supabase JWT guide: https://supabase.com/docs/guides/auth/jwts
- Supabase JWT claims/security considerations: https://supabase.com/docs/guides/auth/jwt-fields
- Supabase RLS guide: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase user management/profile table guidance: https://supabase.com/docs/guides/auth/managing-user-data
- Supabase API security guide: https://supabase.com/docs/guides/api/securing-your-api
- Supabase API keys/user docs warning about service/secret keys: https://supabase.com/docs/guides/auth/users

