# Permission Matrix

## Decision

CMS authorization dung permission flags theo convention:

```txt
<resource>.<action>
```

Examples:

```txt
pages.create
blog-posts.publish
media.upload
roles.edit
settings.general
audit-logs.index
```

Express API la source of truth cho permission enforcement. Frontend dung permission matrix de an/hien UI, nhung moi action quan trong van phai check tren server.

## Permission Actions

| Action | Meaning | Typical HTTP Methods |
| --- | --- | --- |
| `index` | View/list module or resource | `GET` list/detail |
| `create` | Create new resource | `POST` |
| `edit` | Update existing resource | `PATCH`, `PUT` |
| `delete` | Trash/delete resource | `DELETE` |
| `publish` | Change publication state | `POST`, `PATCH` |
| `upload` | Upload file/media | `POST` |
| `restore` | Restore deleted/revision | `POST` |
| `manage` | Broad operational/system action | mixed |

Use specific action flags when possible. Use `manage` only when a feature is truly broad and cannot be expressed as normal CRUD.

## System And Settings

| Group | Permission | Description | MVP |
| --- | --- | --- | --- |
| System | `core.system` | Access system section group | Yes |
| Appearance | `core.appearance` | Access appearance/menu/theme group | Yes |
| Settings | `settings.index` | Access settings area | Yes |
| Settings | `settings.general` | Edit general settings | Yes |
| Settings | `settings.seo` | Edit SEO defaults | P1 |
| Settings | `settings.media` | Edit media settings | P1 |
| Settings | `settings.email` | Edit email settings | P2 |
| Settings | `settings.cache` | Manage cache settings | P2 |

## Users, Roles, Permissions

| Group | Permission | Description | MVP |
| --- | --- | --- | --- |
| Users | `users.index` | List/view admin users | Yes |
| Users | `users.create` | Create/invite admin user | Yes |
| Users | `users.edit` | Edit admin user/profile/status | Yes |
| Users | `users.delete` | Disable/delete admin user | Yes |
| Roles | `roles.index` | List/view roles | Yes |
| Roles | `roles.create` | Create role | Yes |
| Roles | `roles.edit` | Edit role and assigned permissions | Yes |
| Roles | `roles.delete` | Delete role | Yes |
| Permissions | `permissions.index` | View permission catalog | Yes |
| Permissions | `permissions.seed` | Seed/sync permission catalog | P1 |

## Media

| Group | Permission | Description | MVP |
| --- | --- | --- | --- |
| Media | `media.index` | Open/list media library | Yes |
| Media | `media.upload` | Upload files | Yes |
| Media | `media.edit` | Edit media metadata | Yes |
| Media | `media.delete` | Trash/delete media files | Yes |
| Media folders | `media-folders.create` | Create media folder | Yes |
| Media folders | `media-folders.edit` | Rename/move/update folder | Yes |
| Media folders | `media-folders.delete` | Delete folder | Yes |

## Pages

| Group | Permission | Description | MVP |
| --- | --- | --- | --- |
| Pages | `pages.index` | List/view pages | Yes |
| Pages | `pages.create` | Create page | Yes |
| Pages | `pages.edit` | Edit page | Yes |
| Pages | `pages.delete` | Trash/delete page | Yes |
| Pages | `pages.publish` | Publish/unpublish/schedule page | Yes |
| Pages | `pages.preview` | Preview draft page | P1 |

## Blog

| Group | Permission | Description | MVP |
| --- | --- | --- | --- |
| Blog | `blog.index` | Access blog section group | Yes |
| Blog posts | `blog-posts.index` | List/view blog posts | Yes |
| Blog posts | `blog-posts.create` | Create blog post | Yes |
| Blog posts | `blog-posts.edit` | Edit blog post | Yes |
| Blog posts | `blog-posts.delete` | Trash/delete blog post | Yes |
| Blog posts | `blog-posts.publish` | Publish/unpublish/schedule blog post | Yes |
| Categories | `categories.index` | List/view categories | Yes |
| Categories | `categories.create` | Create category | Yes |
| Categories | `categories.edit` | Edit/reorder category | Yes |
| Categories | `categories.delete` | Delete category | Yes |
| Tags | `tags.index` | List/view tags | Yes |
| Tags | `tags.create` | Create tag | Yes |
| Tags | `tags.edit` | Edit tag | Yes |
| Tags | `tags.delete` | Delete tag | Yes |

## Menus And Appearance

| Group | Permission | Description | MVP |
| --- | --- | --- | --- |
| Menus | `menus.index` | List/view menus | Yes |
| Menus | `menus.create` | Create menu | Yes |
| Menus | `menus.edit` | Edit menu metadata/tree | Yes |
| Menus | `menus.delete` | Delete menu | Yes |
| Menu nodes | `menu-nodes.edit` | Edit menu node tree | Yes |
| Theme | `theme.index` | View theme/appearance section | Post-MVP |
| Theme | `theme.options` | Edit theme options | Post-MVP |
| Theme | `theme.custom-css` | Edit custom CSS | Post-MVP |
| Theme | `theme.custom-js` | Edit custom JS | P3 |

## SEO, Slugs, Public Routing

| Group | Permission | Description | MVP |
| --- | --- | --- | --- |
| SEO | `seo-meta.edit` | Edit entity SEO metadata | Yes |
| Slugs | `slugs.edit` | Edit entity slugs | Yes |
| Sitemap | `sitemap.manage` | Generate/refresh sitemap | P1 |

Notes:

- `seo-meta.edit` is usually checked together with parent resource edit permission.
- `slugs.edit` is usually checked together with parent resource edit permission.
- Separate flags are kept for future roles that can edit content but not SEO/routing.

## Audit Logs And Revisions

| Group | Permission | Description | MVP |
| --- | --- | --- | --- |
| Audit logs | `audit-logs.index` | View audit logs | Yes |
| Audit logs | `audit-logs.delete` | Delete/clear audit logs | P2 |
| Revisions | `revisions.index` | View revisions | P1 |
| Revisions | `revisions.restore` | Restore revision | P2 |

## Optional Plugin Permissions

| Group | Permission | Description | MVP |
| --- | --- | --- | --- |
| Gallery | `galleries.index` | List/view galleries | P2 |
| Gallery | `galleries.create` | Create gallery | P2 |
| Gallery | `galleries.edit` | Edit gallery | P2 |
| Gallery | `galleries.delete` | Delete gallery | P2 |
| Contacts | `contacts.index` | List/view contacts | P2 |
| Contacts | `contacts.edit` | Reply/edit contacts | P2 |
| Contacts | `contacts.delete` | Delete contacts | P2 |
| Languages | `languages.index` | List/view languages | P2 |
| Languages | `languages.create` | Create language | P2 |
| Languages | `languages.edit` | Edit language | P2 |
| Languages | `languages.delete` | Delete language | P2 |
| Analytics | `analytics.index` | View analytics | P2 |
| Backups | `backups.index` | View backups | P2 |
| Backups | `backups.create` | Create backup/export | P2 |
| Backups | `backups.restore` | Restore backup | P2 |
| Backups | `backups.delete` | Delete backup | P2 |

## MVP Permission Seed List

These flags must be seeded before MVP auth flows are usable:

```txt
core.system
core.appearance
settings.index
settings.general
users.index
users.create
users.edit
users.delete
roles.index
roles.create
roles.edit
roles.delete
permissions.index
media.index
media.upload
media.edit
media.delete
media-folders.create
media-folders.edit
media-folders.delete
pages.index
pages.create
pages.edit
pages.delete
pages.publish
blog.index
blog-posts.index
blog-posts.create
blog-posts.edit
blog-posts.delete
blog-posts.publish
categories.index
categories.create
categories.edit
categories.delete
tags.index
tags.create
tags.edit
tags.delete
menus.index
menus.create
menus.edit
menus.delete
menu-nodes.edit
seo-meta.edit
slugs.edit
audit-logs.index
```

## Role Presets

### `super-admin`

Purpose: full CMS access.

Permissions:

```txt
*
```

Implementation:

- Seed role slug `super-admin`.
- API treats `super-admin` as bypass after auth/profile active check.
- Do not expose delete of system role in UI.

### `admin`

Purpose: day-to-day CMS admin without dangerous system cleanup.

Includes:

```txt
core.system
core.appearance
settings.index
settings.general
users.index
users.create
users.edit
roles.index
permissions.index
media.*
media-folders.*
pages.*
blog.index
blog-posts.*
categories.*
tags.*
menus.*
menu-nodes.edit
seo-meta.edit
slugs.edit
audit-logs.index
```

Excludes by default:

```txt
users.delete
roles.delete
audit-logs.delete
backups.restore
theme.custom-js
```

### `editor`

Purpose: manage content, media and navigation.

Includes:

```txt
core.appearance
media.index
media.upload
media.edit
pages.index
pages.create
pages.edit
pages.publish
blog.index
blog-posts.index
blog-posts.create
blog-posts.edit
blog-posts.publish
categories.index
categories.create
categories.edit
tags.index
tags.create
tags.edit
menus.index
menus.edit
menu-nodes.edit
seo-meta.edit
slugs.edit
```

Excludes:

```txt
users.*
roles.*
settings.*
media.delete
pages.delete
blog-posts.delete
categories.delete
tags.delete
menus.delete
```

### `author`

Purpose: create and edit own posts/media.

Includes:

```txt
media.index
media.upload
blog.index
blog-posts.index
blog-posts.create
blog-posts.edit
categories.index
tags.index
tags.create
```

Ownership rule:

- API should later support own-resource constraints.
- MVP permission matrix lists global flags; own-resource constraints are service-level checks.

### `viewer`

Purpose: read-only admin access.

Includes:

```txt
pages.index
blog.index
blog-posts.index
categories.index
tags.index
media.index
menus.index
audit-logs.index
```

## Route Permission Mapping

### Pages

| Route | Permission |
| --- | --- |
| `GET /admin/pages` | `pages.index` |
| `POST /admin/pages` | `pages.create` |
| `GET /admin/pages/:pageId` | `pages.index` |
| `PATCH /admin/pages/:pageId` | `pages.edit` |
| `DELETE /admin/pages/:pageId` | `pages.delete` |
| `POST /admin/pages/:pageId/publish` | `pages.publish` |

### Blog Posts

| Route | Permission |
| --- | --- |
| `GET /admin/blog-posts` | `blog-posts.index` |
| `POST /admin/blog-posts` | `blog-posts.create` |
| `GET /admin/blog-posts/:postId` | `blog-posts.index` |
| `PATCH /admin/blog-posts/:postId` | `blog-posts.edit` |
| `DELETE /admin/blog-posts/:postId` | `blog-posts.delete` |
| `POST /admin/blog-posts/:postId/publish` | `blog-posts.publish` |

### Media

| Route | Permission |
| --- | --- |
| `GET /admin/media` | `media.index` |
| `POST /admin/media/upload` | `media.upload` |
| `PATCH /admin/media/files/:fileId` | `media.edit` |
| `DELETE /admin/media/files/:fileId` | `media.delete` |
| `POST /admin/media/folders` | `media-folders.create` |
| `PATCH /admin/media/folders/:folderId` | `media-folders.edit` |
| `DELETE /admin/media/folders/:folderId` | `media-folders.delete` |

### Menus

| Route | Permission |
| --- | --- |
| `GET /admin/menus` | `menus.index` |
| `POST /admin/menus` | `menus.create` |
| `GET /admin/menus/:menuId` | `menus.index` |
| `PATCH /admin/menus/:menuId` | `menus.edit` |
| `DELETE /admin/menus/:menuId` | `menus.delete` |
| `PATCH /admin/menus/:menuId/tree` | `menu-nodes.edit` |

## Frontend Navigation Guard

Sidebar items should use group permissions:

| Sidebar Item | Required Permission |
| --- | --- |
| Dashboard | authenticated |
| Pages | `pages.index` |
| Blog | `blog.index` or any blog child permission |
| Media | `media.index` |
| Menus | `menus.index` |
| Settings | `settings.index` |
| Users | `users.index` |
| Roles | `roles.index` |
| Audit Logs | `audit-logs.index` |

Button/action guards should use specific permissions:

```txt
Create page button -> pages.create
Publish page button -> pages.publish
Upload button -> media.upload
Delete media button -> media.delete
```

## Backend Enforcement Rules

- Every `/admin/*` route requires `requireAuth`.
- Every mutating `/admin/*` route requires specific permission.
- List/detail routes require `*.index`.
- Do not trust frontend hidden buttons.
- Super admin bypass happens only after valid auth and active profile check.
- Public routes do not use admin permission flags, but must enforce publish/status rules.

## Seed Data Shape

Seed rows should include:

```txt
flag
name
group_name
description
is_system
```

Example:

```txt
flag: pages.create
name: Create pages
group_name: Pages
description: Create new CMS pages
is_system: true
```

## Acceptance Criteria

`CMS-0008` duoc xem la done khi:

- Permission flags cho tung MVP module da ro.
- Permission convention thong nhat voi naming convention.
- Role presets da ro.
- Route-to-permission mapping da ro cho core modules.
- Seed list cho `CMS-0226` da ro.
- Frontend/backend guard rules da ro.

