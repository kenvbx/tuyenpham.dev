# Editor Content Model

## Decision

Dung Tiptap lam rich text editor cho MVP.

Content model:

| Field | Role | Storage |
| --- | --- | --- |
| `content_json` | Canonical editable source | `jsonb` |
| `content_html` | Sanitized render/cache output | `text` |
| `content_text` | Plain text search/excerpt helper | `text` |
| `content_version` | Editor/schema version | `integer` |

Rule:

- `content_json` la source of truth.
- `content_html` duoc generate tu `content_json`, sanitize, roi luu lai de public API render nhanh.
- Admin editor load tu `content_json`, khong load nguoc tu HTML.
- Public API tra `content_html` da sanitize.

## Why This Approach

Tiptap supports output as JSON or HTML. JSON giu duoc cau truc document tot hon cho editor, migrations, validation va future features. HTML lai huu ich cho public rendering, SEO, preview va client khong can bundle editor.

Viec luu ca JSON va sanitized HTML cache cho minh su can bang:

- Editor fidelity: load/save bang JSON.
- Public performance: render HTML truc tiep.
- Security: HTML public luon qua sanitizer.
- Future-proof: co the migrate/transform JSON khi editor schema thay doi.

## Editor Library

| Choice | Decision |
| --- | --- |
| Editor | Tiptap |
| Underlying model | ProseMirror document schema |
| Storage source | JSON |
| Render output | Sanitized HTML |
| Sanitizer | DOMPurify server-side and/or shared sanitize config |

## Database Fields

For `pages`:

```sql
content_json jsonb null,
content_html text null,
content_text text null,
content_version integer not null default 1
```

For `blog_posts`:

```sql
content_json jsonb null,
content_html text null,
content_text text null,
content_version integer not null default 1
```

Optional later:

```sql
content_blocks jsonb null
reading_time_minutes integer null
word_count integer null
```

## API Contract

### Admin Create/Update Request

Admin sends JSON as the canonical input:

```json
{
  "title": "About",
  "contentJson": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Hello" }]
      }
    ]
  }
}
```

API responsibilities:

1. Validate Tiptap/ProseMirror JSON shape.
2. Generate HTML from JSON with the approved extension set.
3. Sanitize generated HTML.
4. Extract plain text.
5. Save `content_json`, `content_html`, `content_text`, `content_version`.
6. Create revision snapshot if entity already exists.

### Admin Detail Response

Admin receives both JSON and HTML:

```json
{
  "id": "uuid",
  "title": "About",
  "contentJson": {},
  "contentHtml": "<p>Hello</p>",
  "contentText": "Hello",
  "contentVersion": 1
}
```

### Public Detail Response

Public API should not need editor JSON by default:

```json
{
  "id": "uuid",
  "title": "About",
  "contentHtml": "<p>Hello</p>",
  "excerpt": "Hello",
  "seo": {}
}
```

If a future frontend needs block rendering, add explicit query:

```txt
GET /public/pages/:slug?includeContentJson=true
```

Default remains HTML-only.

## Allowed Editor Extensions For MVP

MVP should stay conservative.

| Extension/Feature | Status | Notes |
| --- | --- | --- |
| Document | allowed | Required |
| Paragraph | allowed | Required |
| Text | allowed | Required |
| Heading `h2-h4` | allowed | Avoid `h1` inside content |
| Bold | allowed | Basic mark |
| Italic | allowed | Basic mark |
| Strike | allowed | Basic mark |
| Bullet list | allowed | Basic content |
| Ordered list | allowed | Basic content |
| Blockquote | allowed | Editorial content |
| Code block | allowed | Developer/blog content |
| Horizontal rule | allowed | Editorial separator |
| Hard break | allowed | Basic formatting |
| Link | allowed with validation | Only safe protocols |
| Image | allowed via media picker | Must reference `media_files`, not arbitrary upload |
| Embed/iframe | not MVP | Security review later |
| Raw HTML | not MVP | Avoid XSS risk |
| Tables | post-MVP | Add when UX/schema is ready |
| Mentions | post-MVP | Not needed for CMS MVP |
| Collaboration | post-MVP | Yjs/collab not MVP |

## Link Policy

Allowed protocols:

```txt
https:
http:
mailto:
tel:
```

Rules:

- External links can use `target="_blank"` only with `rel="noopener noreferrer"`.
- Disallow `javascript:` and data URLs.
- Relative URLs are allowed for internal CMS paths.

## Image Policy

Images inside content must come from media library.

Preferred JSON attributes:

```json
{
  "type": "image",
  "attrs": {
    "mediaId": "uuid",
    "src": "https://...",
    "alt": "Descriptive alt text",
    "title": null
  }
}
```

Rules:

- Admin inserts image through `MediaPicker`.
- API validates `mediaId` exists.
- API can regenerate `src` from media metadata if needed.
- `alt` should be prompted in UI.
- Arbitrary base64 images in editor content are not allowed.

## Sanitization Strategy

All rendered HTML is treated as untrusted until sanitized.

MVP sanitizer:

- Use DOMPurify with a strict allowlist.
- Sanitize server-side before saving `content_html`.
- Sanitize again client-side only if rendering unsaved preview HTML generated in browser.

Allowed tag direction:

```txt
p, br, strong, em, s, blockquote, ul, ol, li,
h2, h3, h4, pre, code, a, img, hr
```

Allowed attribute direction:

```txt
a: href, target, rel
img: src, alt, title, width, height, loading
code/pre: class only if generated by syntax highlighter and allowlisted
```

Disallowed:

```txt
script
style
iframe
object
embed
on* event attributes
javascript: URLs
data: URLs except explicitly reviewed image handling
```

## Validation Strategy

Validation has 3 layers:

| Layer | Validation |
| --- | --- |
| Frontend | Editor extension schema prevents invalid structures |
| Shared/API | Zod validates top-level shape and size limits |
| Backend | Tiptap/ProseMirror generation validates schema compatibility |

Minimum checks:

- `contentJson.type === "doc"`
- Max JSON payload size.
- Max rendered HTML size.
- Allowed node/mark types only.
- Image nodes require valid `mediaId`.
- Link marks require safe URL.

## Revisions

Revision snapshot should include:

```json
{
  "title": "About",
  "contentJson": {},
  "contentHtml": "<p>Hello</p>",
  "contentText": "Hello",
  "contentVersion": 1,
  "seo": {}
}
```

Restore should restore JSON and regenerate sanitized HTML instead of blindly trusting old HTML.

## Preview Strategy

Admin preview:

1. User edits content in Tiptap.
2. Frontend can generate temporary HTML for immediate preview.
3. Unsaved preview HTML must be sanitized before rendering.
4. Saved/draft preview endpoint uses server-generated sanitized HTML.

Public preview route should require auth or signed preview token.

## Search And Excerpt

API extracts `content_text` from JSON/HTML.

Use cases:

- Admin search.
- Public search later.
- Auto excerpt fallback.
- SEO description fallback if explicit meta description missing.

Excerpt rule:

- Prefer explicit `description`/`excerpt`.
- Fallback to first 160 characters from `content_text`.

## Migration And Versioning

`content_version` starts at `1`.

When editor extension schema changes:

1. Increment app-supported content schema version.
2. Add migration script if existing JSON needs transformation.
3. Keep renderer backward-compatible when practical.
4. Regenerate sanitized HTML after migration.

Do not silently mutate old JSON in frontend without API-controlled migration.

## Non-MVP

| Feature | Reason Deferred |
| --- | --- |
| Raw HTML blocks | Security risk |
| Iframe/embed blocks | Needs allowlist and CSP review |
| Collaborative editing | Adds Yjs/session complexity |
| Page builder blocks | Separate product scope |
| Tables | More UX and sanitization complexity |
| Markdown as canonical format | Loses structured editor fidelity |

## Acceptance Criteria

`CMS-0006` duoc xem la done khi:

- Editor library da chot.
- Canonical storage format da chot.
- HTML rendering/cache strategy da chot.
- Sanitization strategy da ro.
- Allowed MVP editor features da ro.
- Database/API fields cho page/post content da ro.
- Revisions/preview/search direction da ro.

## Sources

- Tiptap output JSON/HTML docs: https://tiptap.dev/docs/guides/output-json-html
- Tiptap core concepts and JSON schema note: https://tiptap.dev/docs/editor/core-concepts/introduction
- ProseMirror schema guide: https://prosemirror.net/docs/guide/
- DOMPurify README: https://github.com/cure53/DOMPurify
- MDN Trusted Types API: https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API

