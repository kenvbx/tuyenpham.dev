# Media Storage Policy

## Decision

MVP dung Supabase Storage cho media files, upload qua Express API, metadata luu trong Postgres.

Bucket policy:

| Bucket | Access Model | Purpose | MVP |
| --- | --- | --- | --- |
| `cms-media` | Public read, API-controlled write | Published/public CMS assets | Yes |
| `cms-private` | Private | Future protected files, imports, sensitive assets | Not MVP default |
| `cms-temp` | Private | Temporary/quarantine uploads before finalize | Optional MVP if virus scanning/quarantine added |

MVP default:

- Use one public bucket: `cms-media`.
- Browser/admin does not upload directly to Supabase Storage.
- Admin uploads file to Express API.
- API validates, uploads to Supabase Storage with service role, then creates `media_files` metadata.
- Public assets use stable public URLs.

## Why Public Bucket For MVP

CMS assets such as blog/page featured images, logos, favicon and inline content images are intended to be public once used in published content. Public bucket gives:

- Stable public URLs.
- Simple public rendering.
- Better caching/CDN behavior.
- Less signed URL complexity for normal website content.

Security boundary:

- Public read does not mean public write.
- Upload/write/delete still go through API permission checks.
- Sensitive files should not be uploaded to `cms-media`.

## Storage Architecture

```txt
Admin browser
  -> POST /admin/media/upload
  -> Express API validates auth + media.upload permission
  -> API validates file type/size
  -> API uploads object to Supabase Storage bucket `cms-media`
  -> API creates `media_files` row
  -> API returns media metadata + public URL
```

Public rendering:

```txt
Public API/content
  -> returns media public URL from `media_files.url`
  -> browser loads asset from Supabase Storage CDN/public URL
```

## Bucket Configuration

Bucket: `cms-media`

| Setting | MVP Value |
| --- | --- |
| Access model | Public bucket |
| Upload owner | API only |
| Max file size | 10 MB for images, 25 MB for documents |
| Allowed image types | `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/svg+xml` with restrictions |
| Allowed document types | `application/pdf` |
| Transformations | Optional, only if Supabase plan supports it |
| Cache strategy | Long cache for immutable object paths |

SVG rule:

- SVG can contain scripts/foreign objects and must be treated carefully.
- MVP may either disallow SVG uploads or sanitize SVG before upload.
- Safer MVP default: allow SVG only for trusted admin/super-admin or defer SVG until sanitizer is implemented.

Recommended MVP default:

```txt
Allow: jpg, jpeg, png, webp, gif, pdf
Defer/restrict: svg
Reject: html, js, exe, zip, unknown binary
```

## File Size Policy

| Type | Max Size |
| --- | --- |
| JPEG/PNG/WebP/GIF | 10 MB |
| PDF | 25 MB |
| Favicon | 1 MB |
| Logo | 5 MB |
| Inline editor image | 10 MB |

Large video/audio/files are not MVP.

Post-MVP:

- Add resumable uploads for large files.
- Add video/audio support with separate policy.
- Add private documents with signed URLs.

## File Path Convention

Storage object paths must be deterministic enough for organization and unique enough to avoid collisions.

Pattern:

```txt
<environment>/<yyyy>/<mm>/<uuid>-<safe-base-name>.<ext>
```

Examples:

```txt
production/2026/08/019fe962-cover-image.webp
staging/2026/08/7b5c2d4a-about-hero.png
```

Rules:

- Do not trust original filename directly.
- Generate UUID prefix.
- Slugify/sanitize base filename.
- Preserve verified extension from MIME/type detection.
- Avoid user IDs in public paths unless needed.

## Metadata Model

`media_folders`

```txt
id uuid primary key
name text
slug text
parent_id uuid null references media_folders(id)
color text null
created_by uuid references profiles(id)
updated_by uuid references profiles(id)
deleted_at timestamptz null
created_at timestamptz
updated_at timestamptz
```

`media_files`

```txt
id uuid primary key
folder_id uuid null references media_folders(id)
uploaded_by uuid references profiles(id)
name text
original_name text
alt text null
caption text null
mime_type text
extension text
size_bytes bigint
width integer null
height integer null
duration_seconds integer null
bucket text
object_path text unique
url text
metadata jsonb not null default '{}'
status text not null default 'active'
deleted_at timestamptz null
created_at timestamptz
updated_at timestamptz
```

Statuses:

```txt
active
trashed
deleted
quarantined
failed
```

## Folder Model

Folders are virtual folders in database, not required to mirror bucket path.

Rules:

- `media_folders` controls admin UI organization.
- Moving a file between folders updates DB only.
- Storage object path does not change on folder move.
- Deleting a folder requires moving/deleting children explicitly.

## Upload Validation

API upload validation:

1. Require auth.
2. Require `media.upload`.
3. Check file exists.
4. Check declared MIME type.
5. Sniff file signature where practical.
6. Enforce extension allowlist.
7. Enforce max size.
8. For images, read dimensions.
9. Reject dangerous files.
10. Upload to Supabase Storage.
11. Create metadata row in database.

MIME allowlist MVP:

```txt
image/jpeg
image/png
image/webp
image/gif
application/pdf
image/x-icon
```

Optional with strict sanitizer:

```txt
image/svg+xml
```

## Permissions

| Action | Permission |
| --- | --- |
| List media | `media.index` |
| Upload media | `media.upload` |
| Edit metadata | `media.edit` |
| Delete/trash media | `media.delete` |
| Create folder | `media-folders.create` |
| Edit folder | `media-folders.edit` |
| Delete folder | `media-folders.delete` |

API always checks permissions before using service role key.

## RLS And Storage Policies

Supabase Storage operations use `storage.objects` policies. MVP chooses API-controlled writes, so direct browser writes are not needed.

Policy direction:

- Public read is allowed for `cms-media` objects.
- Direct browser upload/update/delete is denied by default.
- API uses service role key for storage mutations after Express permission checks.
- Metadata tables still have RLS enabled.

RLS direction for metadata:

| Table | Public Read | Admin Write |
| --- | --- | --- |
| `media_files` | safe active fields only if needed | API only |
| `media_folders` | no public read by default | API only |

Public content APIs should return only media fields required to render content.

## URL Strategy

For `cms-media` public bucket:

- Store `bucket` and `object_path`.
- Store generated public `url` for convenience.
- Treat `url` as cacheable derived data.
- If bucket/domain changes, regenerate URLs from `bucket + object_path`.

Do not hardcode Supabase URL throughout content JSON. Editor image nodes should prefer `mediaId`; API/render layer can resolve to current URL.

## Image Transformations

MVP:

- Store original file.
- Extract original dimensions.
- Use CSS responsive sizing in frontend.
- Do not rely on transformations unless current Supabase plan supports it.

Post-MVP:

- Add transformation URL helper for thumbnails.
- Generate and cache thumbnail URLs in media API.
- Consider dedicated thumbnail objects if transformation usage/cost is high.

## Deletion Policy

Use trash/soft delete first.

Flow:

1. Admin clicks delete.
2. API checks `media.delete`.
3. API checks references if possible.
4. Mark `media_files.status = 'trashed'`, set `deleted_at`.
5. Hide trashed files by default.
6. Hard delete object later by explicit action or cleanup job.

Hard delete:

- Requires `media.delete`.
- Should check references.
- Removes object from Supabase Storage.
- Removes or marks DB row as `deleted`.
- Writes audit log.

## Reference Safety

Before hard delete, check references:

- `pages.featured_image_id`
- `blog_posts.featured_image_id`
- `settings` logo/favicon values
- editor `content_json` image `mediaId` references
- galleries later

MVP can start with warning + block hard delete if directly referenced by FK fields. JSON content reference scan can be added before hard-delete production use.

## Orphan Handling

Two orphan types:

| Type | Meaning | Handling |
| --- | --- | --- |
| Storage object without DB row | Upload succeeded but DB insert failed | API cleanup immediately; scheduled scan later |
| DB row without storage object | Object deleted externally | Mark `failed` or repair/delete after audit |

Upload transaction cannot fully wrap external storage, so API must do compensating cleanup:

- If storage upload succeeds but DB insert fails, delete storage object.
- If DB insert succeeds but response fails, keep object and row.

## Audit Requirements

Audit these actions:

```txt
media.upload
media.edit
media.trash
media.restore
media.delete
media-folder.create
media-folder.edit
media-folder.delete
```

Audit fields:

```txt
actor_id
action
entity_type = media_file | media_folder
entity_id
before
after
ip_address
user_agent
created_at
```

## Security Rules

- No direct browser writes for MVP.
- No service role key in frontend.
- Validate file size and MIME on API.
- Reject unknown/dangerous extensions.
- Sanitize/restrict SVG.
- Do not serve private files from public bucket.
- Use RLS on metadata tables.
- Keep storage object paths unguessable enough via UUID prefix.
- Do not overwrite existing objects by path.
- Log upload/delete operations.

## Admin UX Requirements

Media manager MVP should support:

- Grid/list view.
- Folder sidebar.
- Search by name.
- Filter by MIME group.
- Upload progress.
- Metadata edit drawer.
- Alt text field.
- Copy URL.
- Select in `MediaPicker`.
- Trash/delete confirmation.

## Implementation Checklist

| Task | Requirement |
| --- | --- |
| `CMS-0211` | Create `media_folders` |
| `CMS-0212` | Create `media_files` |
| `CMS-0225` | Add RLS for media metadata |
| `CMS-0501` | Create Supabase `cms-media` bucket |
| `CMS-0502` | Upload through API |
| `CMS-0503` | Validate file type/size |
| `CMS-0504` | Extract image metadata |
| `CMS-0505` | List media files |
| `CMS-0506` | Update metadata |
| `CMS-0507` | Trash/delete media |
| `CMS-0508` | Folders CRUD |
| `CMS-0512` | Media picker modal |
| `CMS-0514` | Audit media actions |
| `CMS-1306` | File upload security review |

## Non-MVP

| Feature | Reason Deferred |
| --- | --- |
| Direct browser upload to Storage | More RLS/client policy complexity |
| Private asset library | Public CMS media is enough for MVP |
| Signed URL protected downloads | Needed only for private files |
| Video/audio management | More size/transcoding/player complexity |
| Resumable uploads | Not needed for 10-25 MB MVP limits |
| Virus scanning | Good post-MVP hardening |
| Automatic image optimization pipeline | Can add after core media works |

## Acceptance Criteria

`CMS-0007` duoc xem la done khi:

- Bucket strategy da chot.
- Public/private policy da chot.
- Upload ownership da chot.
- Allowed MIME va size limits da ro.
- File path convention da ro.
- Metadata fields da ro.
- Delete/orphan/audit policy da ro.
- Cac task storage/media implementation co the bat dau.

## Sources

- Supabase Storage docs: https://supabase.com/docs/guides/storage
- Supabase Storage buckets fundamentals: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Row Level Security docs: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage image transformations: https://supabase.com/docs/guides/storage/serving/image-transformations

