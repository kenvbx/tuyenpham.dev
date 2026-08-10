# Public Routing Model

## Decision

Public routing dung central slug registry trong bang `slugs`.

MVP route prefixes:

| Entity | Public URL Pattern | Slug Prefix |
| --- | --- | --- |
| Page | `/<slug>` | empty string |
| Blog post | `/blog/<slug>` | `blog` |
| Category | `/category/<slug>` | `category` |
| Tag | `/tag/<slug>` | `tag` |

Examples:

```txt
/about                 -> page
/privacy-policy        -> page
/blog/hello-world      -> blog post
/category/news         -> category archive
/tag/react             -> tag archive
```

The resolver endpoint:

```txt
GET /public/resolve?path=/about
```

returns the resolved entity type, entity data, SEO metadata and route metadata.

## Why Central Slugs

Botble uses a slug registry to route many entity types through one public resolver. CMS moi can the same capability:

- Page/post/category/tag can share one resolution pipeline.
- Slug uniqueness and redirects are centralized.
- Public API can be headless and route-agnostic.
- Future multi-language support can extend slug rows with `locale`.
- Sitemap generation can read from one place.

## Data Model

`slugs`

```txt
id uuid primary key
key text not null
prefix text not null default ''
locale text not null default 'vi'
reference_type text not null
reference_id uuid not null
is_active boolean not null default true
redirect_to text null
created_by uuid null references profiles(id)
updated_by uuid null references profiles(id)
created_at timestamptz
updated_at timestamptz
```

Recommended unique indexes:

```txt
uniq_slugs_key_prefix_locale_active
  unique (key, prefix, locale)
  where is_active = true

idx_slugs_reference
  (reference_type, reference_id)

idx_slugs_lookup
  (prefix, key, locale, is_active)
```

`reference_type` values:

```txt
page
blog-post
category
tag
```

Use singular entity types in slug registry even when module names are plural.

## Path Parsing

Normalize incoming path before lookup.

Rules:

1. Strip protocol/domain if accidentally passed.
2. Strip query string and hash.
3. Decode URL safely.
4. Trim leading/trailing spaces.
5. Remove leading and trailing slashes.
6. Collapse duplicate slashes.
7. Lowercase generated slugs, but preserve lookup path after normalization.
8. Reject unsafe path segments.

Examples:

| Input | Normalized |
| --- | --- |
| `/about` | `about` |
| `/about/` | `about` |
| `https://site.com/blog/hello-world?x=1` | `blog/hello-world` |
| `//blog//hello-world//` | `blog/hello-world` |

Split normalized path:

```txt
about -> prefix='', key='about'
blog/hello-world -> prefix='blog', key='hello-world'
category/news -> prefix='category', key='news'
tag/react -> prefix='tag', key='react'
```

Nested pages are not MVP. If needed later:

```txt
/company/about -> page with prefix='company', key='about'
```

MVP keeps pages flat at root.

## Reserved Paths

The following root paths are reserved and cannot be page slugs:

```txt
admin
api
auth
public
blog
category
tag
media
assets
static
sitemap.xml
robots.txt
favicon.ico
health
login
logout
```

Reserved prefixes:

```txt
blog
category
tag
admin
api
public
```

Page slug `blog` is not allowed because `/blog/<slug>` is the post prefix.

## Slug Generation

Slug service:

```txt
generateSlug(title, options)
```

Rules:

- Lowercase.
- Remove accents/diacritics where practical.
- Convert spaces and separators to hyphen.
- Remove unsafe characters.
- Collapse repeated hyphens.
- Trim leading/trailing hyphen.
- Limit length, recommended max 160 chars.
- Avoid reserved words.
- Ensure unique active `(key, prefix, locale)`.

Conflict strategy:

```txt
hello-world
hello-world-2
hello-world-3
```

Manual slug edit:

- Admin can edit slug if has `slugs.edit` plus parent edit permission.
- API still normalizes and validates.
- Conflict returns `409 SLUG_CONFLICT`.

## Slug Lifecycle

### Create entity

```txt
create page/post/category/tag
  -> generate slug
  -> insert entity
  -> insert active slug row
```

### Update slug

MVP behavior:

```txt
old slug is deactivated
new slug becomes active
old slug gets redirect_to if redirect option is enabled
```

Fields:

```txt
old row: is_active=false, redirect_to='/new-path'
new row: is_active=true
```

If redirect support is not implemented yet, still keep old slug inactive for history.

### Delete entity

Soft delete/trash:

- Keep active slug row while entity is trashed? No for public.
- Public resolver must check entity status and return 404 for trashed/deleted.
- Slug may remain active for admin reference but is not public-resolvable if entity not published.

Hard delete:

- Deactivate slug rows.
- Keep history if audit requires.

## Public Resolver Algorithm

Input:

```txt
path=/blog/hello-world
locale=vi optional
previewToken optional
```

Algorithm:

1. Normalize path.
2. Extract `prefix` and `key`.
3. Lookup active slug by `(prefix, key, locale)`.
4. If not found, lookup inactive slug with `redirect_to`.
5. If redirect found, return redirect response.
6. If not found, return 404.
7. Load referenced entity based on `reference_type`.
8. For public request, require entity `status = 'published'` and `published_at <= now()` if present.
9. Load SEO metadata.
10. Resolve referenced media URLs.
11. Return typed response.

Public statuses:

| Status | Public Resolvable |
| --- | --- |
| `draft` | No |
| `scheduled` | Only if `published_at <= now()` or converted to published |
| `published` | Yes |
| `archived` | No |
| `deleted` | No |

## Resolver Response Shape

Success:

```json
{
  "type": "page",
  "path": "/about",
  "locale": "vi",
  "slug": {
    "key": "about",
    "prefix": "",
    "canonicalPath": "/about"
  },
  "data": {},
  "seo": {},
  "meta": {
    "resolvedAt": "2026-08-10T00:00:00.000Z"
  }
}
```

Redirect:

```json
{
  "type": "redirect",
  "statusCode": 301,
  "from": "/old-about",
  "to": "/about"
}
```

Not found:

```json
{
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "Route not found"
  }
}
```

## Entity-Specific Public Endpoints

Keep resolver as primary headless route lookup, but also expose convenient typed endpoints.

| Endpoint | Purpose |
| --- | --- |
| `GET /public/resolve?path=/about` | Resolve any route |
| `GET /public/pages/:slug` | Fetch root page by slug |
| `GET /public/blog-posts` | List published posts |
| `GET /public/blog-posts/:slug` | Fetch post under `blog` prefix |
| `GET /public/categories/:slug` | Fetch category archive |
| `GET /public/tags/:slug` | Fetch tag archive |
| `GET /public/menus/:location` | Fetch menu tree |
| `GET /public/settings` | Fetch public-safe settings |

Note: `MVP_SCOPE.md` originally used `/public/posts`; API implementation should prefer `/public/blog-posts` to align naming convention. A compatibility alias can be added later if needed.

## Canonical URL Rules

Canonical path:

| Entity | Canonical Path |
| --- | --- |
| Page | `/${key}` |
| Blog post | `/blog/${key}` |
| Category | `/category/${key}` |
| Tag | `/tag/${key}` |

Home page:

- Root `/` resolves via setting `homepage_page_id`.
- Home page may have slug `home`, but canonical public path is `/`.
- Resolver handles empty path specially before slug lookup.

## Locale Strategy

MVP default locale:

```txt
vi
```

`slugs.locale` exists from the beginning to avoid schema churn later.

MVP does not implement multi-language content. All rows use `locale='vi'`.

Future locale paths:

```txt
/en/about
/vi/gioi-thieu
```

Future resolver can parse locale prefix before route prefix.

## Preview Strategy

Published public route:

```txt
GET /public/resolve?path=/about
```

Draft preview:

```txt
GET /public/preview?type=page&id=<id>&token=<signed-token>
```

Preview rules:

- Requires signed token or authenticated admin session.
- Can resolve draft/scheduled content.
- Should not use normal public cache.
- Returns `noindex` SEO metadata.

## Sitemap Strategy

Sitemap includes:

- Published root pages.
- Published blog posts.
- Published categories if public archive enabled.
- Published tags if public archive enabled.

Sitemap source:

```txt
slugs join referenced entity status
```

Exclude:

- Draft/scheduled future/archived/deleted content.
- Preview routes.
- Admin/API routes.
- Noindex pages.

## Redirect Strategy

MVP may return redirect payload from API. Public frontend or edge layer performs actual redirect.

Stored redirect:

```txt
slugs.redirect_to = '/new-path'
is_active = false
```

Redirect status:

- `301` for permanent slug changes.
- `302` for temporary/manual redirects later.

Manual redirect table is not MVP. Slug history redirects are enough.

## Cache Strategy

Public resolver responses can be cached after `CMS-0911`.

Cache key:

```txt
public-route:<locale>:<path>
```

Invalidation triggers:

- Entity publish/update/delete.
- Slug update.
- SEO update.
- Media URL policy changes.
- Settings affecting homepage/canonical URLs.

MVP can start uncached, then add cache after correctness.

## Error Codes

| Case | HTTP | Code |
| --- | --- | --- |
| Path invalid | 400 | `INVALID_ROUTE_PATH` |
| Route not found | 404 | `ROUTE_NOT_FOUND` |
| Entity not public | 404 | `ROUTE_NOT_FOUND` |
| Slug conflict on write | 409 | `SLUG_CONFLICT` |
| Reserved slug on write | 422 | `SLUG_RESERVED` |
| Preview token invalid | 401 | `PREVIEW_TOKEN_INVALID` |

Use 404 for non-public draft/archived content to avoid leaking existence.

## Admin Slug UI Requirements

Page/post/category/tag forms should show:

- Auto-generated slug from title.
- Editable slug input.
- Prefix preview, e.g. `/blog/my-post`.
- Conflict validation.
- Reserved path validation.
- Canonical URL preview.

Slug edit requires:

```txt
parent resource edit permission + slugs.edit
```

## Implementation Checklist

| Task | Requirement |
| --- | --- |
| `CMS-0209` | Create `slugs` table with indexes |
| `CMS-0210` | Create `seo_meta` table used by resolver |
| `CMS-0603` | Page create inserts slug |
| `CMS-0604` | Page update can update slug |
| `CMS-0606` | Slug generation service |
| `CMS-0607` | Slug conflict handling |
| `CMS-0703` | Blog post create inserts slug |
| `CMS-0704` | Blog post update can update slug |
| `CMS-0901` | Public slug resolver |
| `CMS-0902` | Public page endpoint |
| `CMS-0904` | Public blog post endpoint |
| `CMS-0909` | Sitemap generation |
| `CMS-0911` | Public response caching |

## Acceptance Criteria

`CMS-0009` duoc xem la done khi:

- Slug table model da ro.
- Public URL patterns da ro cho page/post/category/tag.
- Slug generation/conflict/reserved path rules da ro.
- Public resolver algorithm da ro.
- Preview, sitemap, redirect va cache direction da ro.
- Cac task `CMS-0209`, `CMS-0606`, `CMS-0901` co the implement theo tai lieu nay.

