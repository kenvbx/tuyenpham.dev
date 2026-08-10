# CMS MVP Scope

## Purpose

Xay dung mot CMS headless/module-first lay cam hung tu Botble, nhung phu hop voi stack moi:

- Frontend admin: React, TypeScript, Vite
- Styling/UI: Tailwind CSS, Tabler visual language, Tabler icons
- Backend: Node.js, Express, TypeScript
- Database/Auth/Storage: Supabase

MVP tap trung tao duoc mot vertical slice hoan chinh: admin dang nhap, quan ly noi dung, quan ly media, tao menu, cau hinh co ban, va public API resolve noi dung theo slug.

## MVP Product Goals

| Goal | Description | Success Criteria |
| --- | --- | --- |
| Quan tri noi dung cot loi | Admin co the tao/sua/xoa/publish page va blog post | Page/post tao trong admin co the doc qua public API |
| Quan ly media | Admin upload va gan anh vao page/post/settings | File nam trong Supabase Storage, metadata nam trong database |
| Quan ly dieu huong | Admin tao menu va menu nodes | Public API tra menu theo location |
| Phan quyen | User/role/permission duoc kiem soat ro | Route API va UI admin bi chan neu thieu permission |
| Public delivery | Public app/API resolve noi dung bang slug | `/about`, `/blog/my-post`, menu va SEO data tra dung |
| San sang mo rong | Code chia module de sau nay them plugin | Module page/blog/media/menu co boundary ro |

## MVP Modules

| Module | MVP Scope | Notes |
| --- | --- | --- |
| Auth | Login/logout/session current user bang Supabase Auth | Supabase Auth lam identity provider |
| ACL | Users, roles, permissions, route guards, UI guards | Permission flags theo pattern Botble |
| Admin Shell | Sidebar, topbar, breadcrumbs, protected routes, notifications/toasts | UI theo Tabler/Tailwind, khong lam landing page |
| Dashboard | Summary cards co ban | Nang cao widgets de sau MVP |
| Media | Upload, folders, list/grid, metadata, media picker | Supabase Storage + database metadata |
| Pages | CRUD, slug, status, content editor, featured image, SEO panel | Draft/published/scheduled/archived |
| Blog Posts | CRUD, slug, status, content editor, image, SEO, categories, tags | Related posts/view counter de sau MVP |
| Categories | Tree CRUD, parent/order/status | Drag/drop reorder co the P1 neu kip |
| Tags | CRUD/search | Dung cho blog |
| Menus | Menu CRUD, tree nodes, resource/custom URL links | Header/footer/mobile locations |
| Slugs | Central slug registry cho page/post/category | Public resolver dung bang `slugs` |
| SEO | Entity SEO meta + default fallback | Meta title/description/canonical/OG image |
| Settings | General settings: site name, logo, favicon, timezone | SEO/media/email settings de sau MVP neu can |
| Public API | Resolve slug, pages, posts, categories/tags basic, menus, public settings | Headless delivery |
| Audit Logs | Log cac action quan trong o muc backend | MVP toi thieu cho auth/content/media/settings |
| Revisions | Snapshot page/post khi update | UI restore co the de sau MVP |

## Explicit Non-MVP

| Area | Deferred Scope | Target Phase |
| --- | --- | --- |
| Runtime plugin marketplace | Cai/dat/go plugin tu marketplace | Phase 12+ |
| Theme engine day du nhu Botble | Activate/remove themes, Blade-like theme rendering | Post-MVP |
| Advanced widgets | Widget builder, dashboard widget settings | Post-MVP |
| Multi-language content | Translate page/post/slug/menu | Phase 12 |
| Translation management | Quan ly static translation keys | Phase 12 |
| Member portal | Public register/login/profile rieng cho member | Phase 12 |
| Contact module | Public contact form, replies, spam rules | Phase 12 |
| Gallery module | Gallery CRUD va shortcode/embed | Phase 12 |
| Backup/restore UI | Export/import DB va media | Phase 11/13 |
| Analytics dashboard | Google Analytics/Data API integration | Phase 12 |
| Cookie consent | Consent banner configurable | Phase 12 |
| Social login | Google/GitHub/Facebook login settings | Phase 12 |
| Custom JS | Cho admin chen JS public | P3, can security review |
| Visual page builder | Drag/drop block builder | Future |

## MVP Data Model

Bat buoc co cac bang sau:

| Group | Tables |
| --- | --- |
| Auth/ACL | `profiles`, `roles`, `permissions`, `role_permissions`, `user_roles` |
| System | `settings`, `audit_logs`, `revisions`, `admin_notifications` optional |
| Media | `media_folders`, `media_files` |
| Content | `pages`, `posts`, `categories`, `tags`, `post_categories`, `post_tags` |
| Routing/SEO | `slugs`, `seo_meta` |
| Navigation | `menus`, `menu_nodes` |

## MVP Admin Routes

| Area | Routes |
| --- | --- |
| Auth | `/login`, `/logout` |
| Dashboard | `/admin` |
| Pages | `/admin/pages`, `/admin/pages/new`, `/admin/pages/:id/edit` |
| Blog | `/admin/blog/posts`, `/admin/blog/posts/new`, `/admin/blog/posts/:id/edit` |
| Categories | `/admin/blog/categories` |
| Tags | `/admin/blog/tags` |
| Media | `/admin/media` |
| Menus | `/admin/menus`, `/admin/menus/:id` |
| Users | `/admin/system/users` |
| Roles | `/admin/system/roles` |
| Settings | `/admin/settings/general` |
| Audit Logs | `/admin/system/audit-logs` |

## MVP API Surface

| Area | Endpoints |
| --- | --- |
| Health | `GET /health` |
| Auth | `GET /auth/me` |
| Users | `GET/POST/PATCH/DELETE /admin/users` |
| Roles | `GET/POST/PATCH/DELETE /admin/roles` |
| Media | `GET /admin/media`, `POST /admin/media/upload`, `PATCH/DELETE /admin/media/files/:id` |
| Folders | `GET/POST/PATCH/DELETE /admin/media/folders` |
| Pages | `GET/POST /admin/pages`, `GET/PATCH/DELETE /admin/pages/:id` |
| Posts | `GET/POST /admin/posts`, `GET/PATCH/DELETE /admin/posts/:id` |
| Categories | `GET/POST/PATCH/DELETE /admin/categories` |
| Tags | `GET/POST/PATCH/DELETE /admin/tags` |
| Menus | `GET/POST /admin/menus`, `GET/PATCH/DELETE /admin/menus/:id`, `PATCH /admin/menus/:id/tree` |
| Settings | `GET/PATCH /admin/settings/:namespace` |
| Public | `GET /public/resolve`, `GET /public/pages/:slug`, `GET /public/posts`, `GET /public/posts/:slug`, `GET /public/menus/:location`, `GET /public/settings` |

## MVP Release Criteria

| Category | Criteria |
| --- | --- |
| Auth | Admin user dang nhap duoc, logout duoc, session refresh dung |
| Permissions | API route va UI action can permission deu duoc guard |
| Pages | Tao/sua/xoa/publish page, slug unique, public resolve page |
| Blog | Tao/sua/xoa/publish post, gan category/tag/image, public doc post |
| Media | Upload/list/search/select image, metadata luu dung |
| Menus | Tao menu tree va public API tra dung location |
| Settings | Cau hinh site name/logo/favicon/timezone |
| SEO | Page/post co meta title/description/OG image |
| Data | Migration + seed admin role chay duoc tren Supabase moi |
| Quality | Typecheck/lint/build pass cho admin va API |
| Security | Khong expose Supabase service role key tren frontend |
| Documentation | Co README setup local, env vars, migration instructions |

## MVP Acceptance Tests

| Flow | Steps | Expected Result |
| --- | --- | --- |
| Admin login | Login bang admin account | Vao dashboard, thay menu theo permission |
| Create page | Tao page published voi slug `/about` | `GET /public/resolve?path=/about` tra page |
| Create post | Tao post, gan category/tag/image | Public post detail tra content + SEO |
| Upload media | Upload image, sua alt text, gan vao post | Image render qua public URL |
| Build menu | Tao menu header co link page/post/custom URL | `GET /public/menus/header` tra tree dung order |
| Permission guard | User thieu `posts.edit` vao edit post | API tra forbidden, UI an/disable action |
| Settings | Doi site logo/name | Public settings tra gia tri moi |

## Risks And Decisions

| Topic | Decision | Risk | Mitigation |
| --- | --- | --- | --- |
| Supabase Auth + custom ACL | Dung Supabase Auth cho identity, table rieng cho role/permission | Permission bi lech giua client/server | Server la source of truth, frontend chi dung de hien UI |
| Content editor | Dung rich text editor luu HTML/JSON theo quyet dinh task CMS-0006 | XSS tu editor content | Sanitize output/input, whitelist embeds |
| Slug model | Dung bang `slugs` tap trung | Conflict routing neu prefix/locale sai | Unique index va slug resolver test |
| Media | Supabase Storage + metadata DB | Orphan files khi DB fail | Upload flow co cleanup va audit |
| Plugin architecture | Module-first truoc, plugin runtime sau | Over-engineering neu lam plugin som | MVP chi can module registry noi bo |

## Definition Of Done For MVP Scope

- Danh sach module MVP da ro.
- Danh sach non-MVP/deferred da ro.
- Release criteria da ro.
- Acceptance tests cap san pham da ro.
- Cac task phu thuoc trong tracker co the chuyen sang `ready`.

