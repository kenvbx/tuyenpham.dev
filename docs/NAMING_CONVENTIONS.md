# Naming Conventions

## Purpose

Tai lieu nay chot cach dat ten cho CMS monorepo de scaffold va phat trien ve sau khong bi lech convention giua frontend, backend, database va docs.

Ap dung cho:

- Folder va file trong `apps/*`, `packages/*`, `supabase/*`
- TypeScript variables, functions, classes, types
- React components/hooks
- API routes va response fields
- Database tables, columns, indexes, constraints
- Permission flags
- Environment variables
- Task IDs va docs

## Global Rules

| Thing | Convention | Example |
| --- | --- | --- |
| Folders | kebab-case for app-level folders, plural module names | `apps/admin/src/modules/blog-posts` |
| Files | kebab-case + purpose suffix | `blog-posts.service.ts` |
| TypeScript variables/functions | camelCase | `createBlogPost` |
| TypeScript types/interfaces | PascalCase | `BlogPost`, `CreateBlogPostInput` |
| React components | PascalCase file/component | `BlogPostForm.tsx` |
| React hooks | camelCase with `use` prefix | `useBlogPostQuery` |
| Constants | UPPER_SNAKE_CASE for true constants | `DEFAULT_PAGE_SIZE` |
| Enum-like object exports | PascalCase object, UPPER_SNAKE_CASE keys | `ContentStatus.PUBLISHED` |
| Database tables | snake_case plural | `blog_posts`, `media_files` |
| Database columns | snake_case | `published_at`, `created_by` |
| API paths | kebab-case plural | `/admin/blog-posts` |
| JSON fields | camelCase | `publishedAt`, `featuredImageId` |
| Permission flags | dot.case resource.action | `blog-posts.create` |
| Env vars | UPPER_SNAKE_CASE | `SUPABASE_SERVICE_ROLE_KEY` |

## Module Names

Module names should be plural when they manage a collection.

| Domain | Module Name | API Resource | DB Table |
| --- | --- | --- | --- |
| Pages | `pages` | `/admin/pages` | `pages` |
| Blog posts | `blog-posts` | `/admin/blog-posts` | `blog_posts` |
| Categories | `categories` | `/admin/categories` | `categories` |
| Tags | `tags` | `/admin/tags` | `tags` |
| Media files | `media-files` | `/admin/media/files` | `media_files` |
| Media folders | `media-folders` | `/admin/media/folders` | `media_folders` |
| Menus | `menus` | `/admin/menus` | `menus` |
| Menu nodes | `menu-nodes` | nested under menus | `menu_nodes` |
| Users | `users` | `/admin/users` | `profiles` + Supabase `auth.users` |
| Roles | `roles` | `/admin/roles` | `roles` |
| Permissions | `permissions` | `/admin/permissions` | `permissions` |
| Settings | `settings` | `/admin/settings/:namespace` | `settings` |
| Slugs | `slugs` | internal/public resolver | `slugs` |
| SEO meta | `seo-meta` | nested under entity | `seo_meta` |
| Audit logs | `audit-logs` | `/admin/audit-logs` | `audit_logs` |
| Revisions | `revisions` | nested under entity | `revisions` |

Exception: Admin route grouping may use `/admin/blog/posts` for UX, but API resource should prefer `/admin/blog-posts` for simple resource naming.

## File Naming

### API Module Files

Pattern:

```txt
apps/api/src/modules/<module>/
  <module>.routes.ts
  <module>.controller.ts
  <module>.service.ts
  <module>.repository.ts
  <module>.schemas.ts
  <module>.types.ts
  <module>.permissions.ts
  <module>.audit.ts
```

Example:

```txt
apps/api/src/modules/blog-posts/
  blog-posts.routes.ts
  blog-posts.controller.ts
  blog-posts.service.ts
  blog-posts.repository.ts
  blog-posts.schemas.ts
  blog-posts.types.ts
  blog-posts.permissions.ts
```

### Admin Module Files

Pattern:

```txt
apps/admin/src/modules/<module>/
  <module>.api.ts
  <module>.queries.ts
  <module>.routes.tsx
  <module>.types.ts
  <module>.permissions.ts
  components/
  pages/
```

Example:

```txt
apps/admin/src/modules/pages/
  pages.api.ts
  pages.queries.ts
  pages.routes.tsx
  pages.types.ts
  components/PageForm.tsx
  pages/PageListPage.tsx
  pages/PageEditPage.tsx
```

### Shared Package Files

Pattern:

```txt
packages/shared/src/modules/<module>/
  <module>.constants.ts
  <module>.schemas.ts
  <module>.types.ts
```

Shared exports should be explicit through `index.ts`.

## TypeScript Naming

| Category | Convention | Example |
| --- | --- | --- |
| Entity type | PascalCase singular | `BlogPost` |
| Create input | `Create<Entity>Input` | `CreateBlogPostInput` |
| Update input | `Update<Entity>Input` | `UpdateBlogPostInput` |
| List query | `<Entity>ListQuery` | `BlogPostListQuery` |
| List response | `<Entity>ListResponse` | `BlogPostListResponse` |
| Detail response | `<Entity>DetailResponse` | `BlogPostDetailResponse` |
| Service class/object | `<module>Service` | `blogPostsService` |
| Repository class/object | `<module>Repository` | `blogPostsRepository` |
| Controller handler | verb + entity | `createBlogPost` |
| Middleware | verb phrase | `requirePermission` |
| Error class | `<Reason>Error` | `ForbiddenError` |

Use `type` for data shapes by default. Use `interface` only when declaration merging or class contracts are useful.

## React Naming

| Category | Convention | Example |
| --- | --- | --- |
| Page component | `<Entity><Action>Page` | `BlogPostEditPage` |
| Form component | `<Entity>Form` | `BlogPostForm` |
| Table component | `<Entity>Table` | `BlogPostTable` |
| Picker component | `<Entity>Picker` | `MediaPicker` |
| Modal component | `<Entity><Action>Dialog` | `DeletePageDialog` |
| Drawer component | `<Entity><Action>Drawer` | `MediaDetailDrawer` |
| Hook query | `use<Entity>Query` | `useBlogPostQuery` |
| Hook list query | `use<Entity>ListQuery` | `useBlogPostListQuery` |
| Hook mutation | `use<Action><Entity>Mutation` | `useCreateBlogPostMutation` |

React component files use PascalCase:

```txt
PageForm.tsx
BlogPostTable.tsx
MediaPicker.tsx
```

Non-component module files use kebab-case:

```txt
blog-posts.api.ts
blog-posts.queries.ts
```

## API Naming

### Route Paths

Use plural kebab-case resources:

```txt
GET    /admin/pages
POST   /admin/pages
GET    /admin/pages/:pageId
PATCH  /admin/pages/:pageId
DELETE /admin/pages/:pageId

GET    /admin/blog-posts
POST   /admin/blog-posts
GET    /admin/blog-posts/:postId
PATCH  /admin/blog-posts/:postId
DELETE /admin/blog-posts/:postId
```

Nested routes are allowed when the child cannot stand alone:

```txt
GET   /admin/menus/:menuId/nodes
PATCH /admin/menus/:menuId/tree
GET   /admin/pages/:pageId/revisions
```

Avoid action words in resource routes unless the action is not CRUD:

```txt
POST /admin/media/upload
POST /admin/pages/:pageId/publish
POST /admin/revisions/:revisionId/restore
```

### Route Params

Use camelCase and include entity name:

```txt
:pageId
:postId
:menuId
:revisionId
```

Avoid generic params:

```txt
:id
:slug
```

Exception: public routes can use `:slug` where slug is the resource itself.

### JSON Fields

API JSON must use camelCase:

```json
{
  "id": "uuid",
  "title": "About",
  "publishedAt": "2026-08-10T00:00:00.000Z",
  "featuredImageId": "uuid",
  "createdBy": "uuid"
}
```

Database stays snake_case. Mapping happens in repository/service layer.

### Pagination

Use this response shape:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 100,
    "pageCount": 5
  }
}
```

Query params:

```txt
page
perPage
search
sort
direction
status
```

## Database Naming

### Tables

Use plural snake_case:

```txt
pages
blog_posts
media_files
media_folders
menu_nodes
audit_logs
```

Join tables use singular-ish pair in natural plural table form:

```txt
post_categories
post_tags
role_permissions
user_roles
```

### Columns

Common columns:

```txt
id uuid primary key
created_at timestamptz
updated_at timestamptz
deleted_at timestamptz nullable
created_by uuid nullable
updated_by uuid nullable
status text
```

Foreign keys:

```txt
author_id
featured_image_id
folder_id
parent_id
role_id
permission_id
```

Booleans:

```txt
is_featured
is_default
is_system
is_active
```

Timestamps:

```txt
published_at
scheduled_at
last_login_at
read_at
deleted_at
```

### Indexes And Constraints

Pattern:

```txt
idx_<table>_<columns>
uniq_<table>_<columns>
fk_<table>_<column>
chk_<table>_<meaning>
```

Examples:

```txt
idx_blog_posts_status_published_at
uniq_slugs_key_prefix_locale
fk_blog_posts_author_id
chk_pages_status
```

### Migration Files

Use 6-digit ordered prefix + kebab/snake description:

```txt
000001_auth_acl.sql
000002_settings.sql
000003_media.sql
000004_content.sql
000005_menus.sql
000006_audit_revisions.sql
```

If a migration is added between existing files, append the next number. Do not renumber applied migrations.

## Permission Flags

Permission flags use dot.case:

```txt
<resource>.<action>
```

Actions:

| Action | Meaning |
| --- | --- |
| `index` | List/view module |
| `create` | Create new entity |
| `edit` | Update entity |
| `delete` | Delete/trash entity |
| `publish` | Change publish status |
| `restore` | Restore deleted/revision |
| `manage` | Broad administrative operation |

Examples:

```txt
pages.index
pages.create
pages.edit
pages.delete
pages.publish
blog-posts.index
blog-posts.create
media.upload
menus.edit
settings.general
audit-logs.index
revisions.restore
```

Use resource names aligned with API paths where practical:

```txt
blog-posts.edit
media-files.delete
media-folders.create
```

System grouping flags:

```txt
core.system
core.appearance
settings.index
blog.index
```

## Status Values

Content statuses:

```txt
draft
published
scheduled
archived
deleted
```

Operational statuses:

```txt
active
inactive
blocked
pending
completed
failed
```

Task tracking statuses stay as defined in `CMS_TASK_TRACKING.md`:

```txt
todo
ready
in_progress
blocked
review
done
```

## Environment Variables

Use UPPER_SNAKE_CASE.

Admin public variables must start with `VITE_`:

```txt
VITE_API_URL
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

API private variables:

```txt
NODE_ENV
PORT
APP_URL
ADMIN_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
CORS_ORIGINS
```

## Git Branches And Commits

Future branch naming:

```txt
feature/cms-0101-monorepo-scaffold
feature/cms-0601-pages-api
fix/cms-1307-permission-tests
docs/cms-0003-naming-conventions
```

Commit style:

```txt
feat(cms-0101): scaffold monorepo workspace
docs(cms-0003): add naming conventions
fix(cms-0304): enforce permission middleware
```

## Documentation Naming

Docs use UPPER_SNAKE_CASE for long-lived decisions:

```txt
docs/MVP_SCOPE.md
docs/MONOREPO_ARCHITECTURE.md
docs/NAMING_CONVENTIONS.md
```

Feature docs may use kebab-case if many files appear under a folder:

```txt
docs/features/media-manager.md
docs/features/menu-builder.md
```

## Good And Bad Examples

| Category | Good | Avoid |
| --- | --- | --- |
| API file | `blog-posts.service.ts` | `blogPostService.ts` |
| React component | `BlogPostForm.tsx` | `blog-post-form.tsx` |
| DB table | `blog_posts` | `blogPosts` |
| JSON field | `publishedAt` | `published_at` |
| Permission | `blog-posts.edit` | `edit_posts` |
| Route | `/admin/blog-posts/:postId` | `/admin/blogPost/:id` |
| Column | `featured_image_id` | `featuredImageId` |
| Env | `SUPABASE_SERVICE_ROLE_KEY` | `supabaseServiceRoleKey` |

## Acceptance Criteria

`CMS-0003` duoc xem la done khi:

- File/folder naming da ro.
- Route/API naming da ro.
- Database naming da ro.
- Permission flag naming da ro.
- TypeScript/React naming da ro.
- Cac task scaffold co the dung convention nay de tao code.

