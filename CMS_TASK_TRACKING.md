# CMS Task Tracking

## Status Legend

| Status | Meaning |
| --- | --- |
| `todo` | Chua bat dau |
| `ready` | Da du thong tin de lam |
| `in_progress` | Dang thuc hien |
| `blocked` | Dang bi chan boi dependency/quyet dinh |
| `review` | Can review/test |
| `done` | Hoan thanh |

## Priority Legend

| Priority | Meaning |
| --- | --- |
| `P0` | Bat buoc cho MVP |
| `P1` | Quan trong, nen co som |
| `P2` | Nang cao, sau MVP |
| `P3` | Nice-to-have |

## Phase 0: Product, Architecture, Foundations

| ID | Task | Priority | Status | Owner | Dependencies | Deliverable | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMS-0001 | Chot pham vi MVP CMS | P0 | done | Product/Tech | None | `docs/MVP_SCOPE.md` | Co danh sach module MVP, non-MVP, release criteria |
| CMS-0002 | Chot kien truc monorepo | P0 | done | Tech | CMS-0001 | `docs/MONOREPO_ARCHITECTURE.md` | Thong nhat `/apps/admin`, `/apps/api`, `/packages/shared`, `/packages/ui` |
| CMS-0003 | Chot naming convention | P0 | done | Tech | CMS-0002 | `docs/NAMING_CONVENTIONS.md` | Co convention cho file, folder, route, table, permission flag |
| CMS-0004 | Chot auth strategy voi Supabase | P0 | done | Tech | CMS-0001 | `docs/SUPABASE_AUTH_STRATEGY.md` | Quyet dinh Supabase Auth + custom ACL tables |
| CMS-0005 | Chot deployment target | P1 | done | DevOps | CMS-0002 | `docs/DEPLOYMENT_TARGET.md` | Biet API/admin deploy o dau, env vars nao can |
| CMS-0006 | Chot editor content model | P0 | done | Product/Tech | CMS-0001 | `docs/EDITOR_CONTENT_MODEL.md` | Chon Tiptap/Markdown/HTML JSON strategy |
| CMS-0007 | Chot media storage policy | P0 | done | Tech | CMS-0004 | `docs/MEDIA_STORAGE_POLICY.md` | Xac dinh bucket, public/private, file size, allowed mime |
| CMS-0008 | Lap permission matrix tong the | P0 | done | Product/Tech | CMS-0001 | `docs/PERMISSION_MATRIX.md` | Co permission flags cho tung module |
| CMS-0009 | Lap public routing model | P0 | done | Tech | CMS-0001 | `docs/PUBLIC_ROUTING_MODEL.md` | Dinh nghia slug resolver cho page/post/category |
| CMS-0010 | Tao issue/task template noi bo | P2 | done | Tech | None | `docs/templates/` | Co mau task, bug, feature, release checklist |

## Phase 1: Project Scaffold

| ID | Task | Priority | Status | Owner | Dependencies | Deliverable | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMS-0101 | Khoi tao workspace monorepo | P0 | done | Tech | CMS-0002 | Base repo | Co package manager, workspaces, root scripts |
| CMS-0102 | Tao app admin React + TypeScript + Vite | P0 | ready | Frontend | CMS-0101 | `/apps/admin` | `dev`, `build`, `lint` chay duoc |
| CMS-0103 | Tao app API Node + Express + TypeScript | P0 | ready | Backend | CMS-0101 | `/apps/api` | API healthcheck chay duoc |
| CMS-0104 | Tao shared package | P0 | ready | Fullstack | CMS-0101 | `/packages/shared` | Share duoc constants/types/schemas |
| CMS-0105 | Tao UI package | P1 | ready | Frontend | CMS-0101 | `/packages/ui` | Co button/input/card/table base components |
| CMS-0106 | Cau hinh TypeScript strict | P0 | ready | Tech | CMS-0101 | TS config | Strict mode bat tren tat ca packages |
| CMS-0107 | Cau hinh ESLint/Prettier | P0 | ready | Tech | CMS-0101 | Lint/format scripts | `lint` va `format` dung chung |
| CMS-0108 | Cau hinh Tailwind CSS | P0 | todo | Frontend | CMS-0102 | Tailwind config | Tailwind build dung trong admin |
| CMS-0109 | Them Tabler icons | P0 | todo | Frontend | CMS-0102 | Icon system | Dung `@tabler/icons-react` trong UI |
| CMS-0110 | Tao env schema validation | P0 | todo | Backend | CMS-0103 | Env validator | App fail fast khi thieu env bat buoc |
| CMS-0111 | Tao error handling middleware | P0 | todo | Backend | CMS-0103 | Error middleware | API tra JSON error consistent |
| CMS-0112 | Tao request logger | P1 | todo | Backend | CMS-0103 | Logging middleware | Log method/path/status/duration |
| CMS-0113 | Tao API response convention | P0 | todo | Backend | CMS-0103 | Response contract | Thong nhat pagination, error, validation response |
| CMS-0114 | Cau hinh test framework | P1 | ready | Tech | CMS-0101 | Test setup | Unit/integration test chay duoc |
| CMS-0115 | Cau hinh CI baseline | P1 | ready | DevOps | CMS-0101 | CI workflow | CI chay lint/typecheck/test/build |

## Phase 2: Supabase Database Foundation

| ID | Task | Priority | Status | Owner | Dependencies | Deliverable | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMS-0201 | Tao Supabase project/env config | P0 | ready | Backend | CMS-0004 | Supabase connection | API ket noi Supabase duoc |
| CMS-0202 | Tao migration runner strategy | P0 | todo | Backend | CMS-0201 | Migration workflow | Co cach apply SQL migrations local/prod |
| CMS-0203 | Tao table `profiles` | P0 | todo | Backend | CMS-0202 | SQL migration | Profile map voi `auth.users` |
| CMS-0204 | Tao table `roles` | P0 | todo | Backend | CMS-0202 | SQL migration | Role co slug, name, description, system flag |
| CMS-0205 | Tao table `permissions` | P0 | todo | Backend | CMS-0202 | SQL migration | Permission flags unique |
| CMS-0206 | Tao table `role_permissions` | P0 | todo | Backend | CMS-0204 CMS-0205 | SQL migration | Role gan nhieu permission |
| CMS-0207 | Tao table `user_roles` | P0 | todo | Backend | CMS-0203 CMS-0204 | SQL migration | User co nhieu role |
| CMS-0208 | Tao table `settings` | P0 | todo | Backend | CMS-0202 | SQL migration | Key-value JSON settings |
| CMS-0209 | Tao table `slugs` | P0 | ready | Backend | CMS-0202 | SQL migration | Unique active slug theo prefix/locale |
| CMS-0210 | Tao table `seo_meta` | P0 | todo | Backend | CMS-0202 | SQL migration | SEO meta gan polymorphic entity |
| CMS-0211 | Tao table `media_folders` | P0 | todo | Backend | CMS-0202 | SQL migration | Folder tree ho tro parent |
| CMS-0212 | Tao table `media_files` | P0 | todo | Backend | CMS-0211 | SQL migration | Luu metadata file Supabase Storage |
| CMS-0213 | Tao table `pages` | P0 | todo | Backend | CMS-0203 CMS-0209 | SQL migration | Page co status, content, image, author |
| CMS-0214 | Tao table `posts` | P0 | todo | Backend | CMS-0203 CMS-0209 | SQL migration | Post co status, publish time, views |
| CMS-0215 | Tao table `categories` | P0 | todo | Backend | CMS-0214 | SQL migration | Category tree |
| CMS-0216 | Tao table `tags` | P0 | todo | Backend | CMS-0214 | SQL migration | Tags unique slug/name |
| CMS-0217 | Tao table `post_categories` | P0 | todo | Backend | CMS-0214 CMS-0215 | SQL migration | Many-to-many post/category |
| CMS-0218 | Tao table `post_tags` | P0 | todo | Backend | CMS-0214 CMS-0216 | SQL migration | Many-to-many post/tag |
| CMS-0219 | Tao table `menus` | P0 | todo | Backend | CMS-0202 | SQL migration | Menu co slug/location |
| CMS-0220 | Tao table `menu_nodes` | P0 | todo | Backend | CMS-0219 | SQL migration | Menu node tree reorder duoc |
| CMS-0221 | Tao table `audit_logs` | P1 | todo | Backend | CMS-0203 | SQL migration | Ghi user/action/entity/before/after |
| CMS-0222 | Tao table `revisions` | P1 | todo | Backend | CMS-0203 | SQL migration | Luu snapshot page/post/settings |
| CMS-0223 | Tao table `admin_notifications` | P2 | todo | Backend | CMS-0203 | SQL migration | Notification co read state |
| CMS-0224 | Tao database indexes | P0 | todo | Backend | CMS-0203-CMS-0222 | SQL migration | Index cho slug, status, published_at, author |
| CMS-0225 | Thiet ke RLS policies | P0 | todo | Backend | CMS-0203-CMS-0222 | SQL policies | RLS bat cho tables can thiet |
| CMS-0226 | Tao seed permissions | P0 | ready | Backend | CMS-0205 | Seed SQL | Co permission cho system/content/media/menu |
| CMS-0227 | Tao seed admin role | P0 | todo | Backend | CMS-0204 CMS-0226 | Seed SQL | Admin role co full permissions |
| CMS-0228 | Tao seed sample content | P2 | todo | Backend | CMS-0213 CMS-0214 | Seed SQL | Co demo page/post/menu |

## Phase 3: Auth, Users, Roles, Permissions

| ID | Task | Priority | Status | Owner | Dependencies | Deliverable | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMS-0301 | Implement Supabase auth client backend | P0 | todo | Backend | CMS-0201 | Auth service | Verify JWT tu Supabase |
| CMS-0302 | Implement auth middleware | P0 | todo | Backend | CMS-0301 | `requireAuth` | Protected route doc duoc user |
| CMS-0303 | Implement permission resolver | P0 | todo | Backend | CMS-0204-CMS-0207 | Permission service | Resolve permission tu roles/user |
| CMS-0304 | Implement permission middleware | P0 | todo | Backend | CMS-0303 | `requirePermission` | Route bi chan neu thieu permission |
| CMS-0305 | API login/session current user | P0 | todo | Backend | CMS-0301 | `/auth/me` | Tra profile, roles, permissions |
| CMS-0306 | API user list | P0 | todo | Backend | CMS-0304 | Users endpoint | Filter/search/pagination |
| CMS-0307 | API create user | P1 | todo | Backend | CMS-0304 | Users endpoint | Tao auth user + profile + roles |
| CMS-0308 | API update user | P1 | todo | Backend | CMS-0304 | Users endpoint | Cap nhat profile/roles/status |
| CMS-0309 | API disable/delete user | P1 | todo | Backend | CMS-0304 | Users endpoint | Chan login hoac soft delete |
| CMS-0310 | API role CRUD | P0 | todo | Backend | CMS-0304 | Roles endpoint | Tao/sua/xoa role, gan permissions |
| CMS-0311 | Frontend login page | P0 | todo | Frontend | CMS-0305 | Login UI | Login thanh cong vao admin |
| CMS-0312 | Frontend auth store | P0 | todo | Frontend | CMS-0305 | Auth state | Luu session, current user, permissions |
| CMS-0313 | Frontend protected routes | P0 | todo | Frontend | CMS-0312 | Route guard | Redirect login neu chua auth |
| CMS-0314 | Frontend permission guard | P0 | todo | Frontend | CMS-0312 | Permission UI guard | Hide/disable UI theo permission |
| CMS-0315 | Users management UI | P1 | todo | Frontend | CMS-0306-CMS-0309 | Users pages | List/create/edit users |
| CMS-0316 | Roles management UI | P0 | todo | Frontend | CMS-0310 | Roles pages | Role form co permission matrix |
| CMS-0317 | Profile page | P1 | todo | Frontend | CMS-0305 | Profile UI | User sua ten/avatar/password |
| CMS-0318 | Audit auth events | P1 | todo | Backend | CMS-0221 CMS-0301 | Audit records | Login, logout, role changes duoc log |

## Phase 4: Admin Shell And Design System

| ID | Task | Priority | Status | Owner | Dependencies | Deliverable | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMS-0401 | Build admin layout | P0 | todo | Frontend | CMS-0108 CMS-0109 | Layout | Sidebar, topbar, content area, responsive |
| CMS-0402 | Build navigation registry | P0 | todo | Frontend/Backend | CMS-0314 | Nav system | Menu hien theo permission |
| CMS-0403 | Build breadcrumbs | P1 | todo | Frontend | CMS-0401 | Breadcrumb component | Moi admin page co breadcrumb |
| CMS-0404 | Build page header actions | P1 | todo | Frontend | CMS-0401 | Header component | Title/actions/status consistent |
| CMS-0405 | Build DataTable component | P0 | todo | Frontend | CMS-0105 | DataTable | Search/filter/sort/pagination |
| CMS-0406 | Build bulk actions pattern | P1 | todo | Frontend/Backend | CMS-0405 | Bulk actions | Select rows, dispatch bulk action |
| CMS-0407 | Build form components | P0 | todo | Frontend | CMS-0105 | Forms | Input/select/textarea/switch/date/upload |
| CMS-0408 | Build validation display | P0 | todo | Frontend | CMS-0407 | Form validation UX | Field errors tu API hien dung |
| CMS-0409 | Build modal/drawer components | P1 | todo | Frontend | CMS-0105 | Overlay components | Dung cho media picker/menu node |
| CMS-0410 | Build toast/notification system | P0 | todo | Frontend | CMS-0401 | Toasts | Success/error/loading states |
| CMS-0411 | Build empty/error/loading states | P0 | todo | Frontend | CMS-0401 | State components | Moi table/page co state chuan |
| CMS-0412 | Build confirmation dialog | P0 | todo | Frontend | CMS-0409 | Confirm UI | Delete/destructive action co confirm |
| CMS-0413 | Build dashboard overview | P1 | todo | Frontend/Backend | CMS-0401 | Dashboard page | Co summary cards/recent content |
| CMS-0414 | Responsive QA desktop/mobile | P1 | todo | Frontend | CMS-0401-CMS-0413 | QA fixes | Khong overlap text/UI tren viewport chinh |

## Phase 5: Media Manager

| ID | Task | Priority | Status | Owner | Dependencies | Deliverable | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMS-0501 | Tao Supabase Storage bucket | P0 | ready | Backend | CMS-0201 CMS-0007 | Storage bucket | Bucket config dung public/private policy |
| CMS-0502 | API upload file | P0 | todo | Backend | CMS-0212 CMS-0501 | Upload endpoint | Upload tao record `media_files` |
| CMS-0503 | Validate file type/size | P0 | todo | Backend | CMS-0502 | Validation | Reject file khong hop le |
| CMS-0504 | Extract image metadata | P1 | todo | Backend | CMS-0502 | Metadata extraction | Width/height/blurhash/color neu can |
| CMS-0505 | API list media files | P0 | todo | Backend | CMS-0212 | Media endpoint | Filter folder/type/search/pagination |
| CMS-0506 | API update media metadata | P0 | todo | Backend | CMS-0212 | Media endpoint | Sua name, alt, folder |
| CMS-0507 | API delete/trash media file | P0 | todo | Backend | CMS-0212 | Media endpoint | Soft delete + optional storage delete |
| CMS-0508 | API folders CRUD | P0 | todo | Backend | CMS-0211 | Folder endpoint | Tao/sua/xoa folder tree |
| CMS-0509 | Admin media library page | P0 | todo | Frontend | CMS-0505 | Media UI | Grid/list, folder sidebar |
| CMS-0510 | Drag/drop upload UI | P0 | todo | Frontend | CMS-0502 | Upload UI | Upload progress, error handling |
| CMS-0511 | Media detail drawer | P1 | todo | Frontend | CMS-0506 | Detail UI | Preview + metadata form |
| CMS-0512 | Media picker modal | P0 | todo | Frontend | CMS-0505 | Picker | Dung duoc trong page/post/menu/settings |
| CMS-0513 | Image alt text workflow | P1 | todo | Frontend/Backend | CMS-0506 | Alt field | SEO/accessibility field bat buoc/canh bao |
| CMS-0514 | Audit media actions | P1 | todo | Backend | CMS-0221 CMS-0502 | Audit logs | Upload/update/delete duoc log |

## Phase 6: Pages

| ID | Task | Priority | Status | Owner | Dependencies | Deliverable | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMS-0601 | API page list | P0 | todo | Backend | CMS-0213 CMS-0304 | Pages endpoint | Search/filter/status/pagination |
| CMS-0602 | API page detail | P0 | todo | Backend | CMS-0213 | Pages endpoint | Tra page + slug + seo + author |
| CMS-0603 | API create page | P0 | todo | Backend | CMS-0213 CMS-0209 | Pages endpoint | Tao page + slug unique |
| CMS-0604 | API update page | P0 | todo | Backend | CMS-0602 | Pages endpoint | Update page/slug/seo atomic |
| CMS-0605 | API delete page | P0 | todo | Backend | CMS-0602 | Pages endpoint | Soft delete hoac delete co confirm |
| CMS-0606 | Slug generation service | P0 | ready | Backend | CMS-0209 | Slug service | Auto tao slug unique tu title |
| CMS-0607 | Slug conflict handling | P0 | ready | Backend/Frontend | CMS-0606 | Conflict UX | Bao loi hoac auto suffix |
| CMS-0608 | Page status workflow | P0 | todo | Backend/Frontend | CMS-0603 | Status logic | Draft/published/scheduled/archived |
| CMS-0609 | Page list UI | P0 | todo | Frontend | CMS-0601 CMS-0405 | Pages list | Table co actions/edit/delete |
| CMS-0610 | Page create/edit UI | P0 | todo | Frontend | CMS-0603 CMS-0604 CMS-0407 | Page form | Title, slug, content, status, image, SEO |
| CMS-0611 | Rich text editor integration | P0 | todo | Frontend | CMS-0006 CMS-0610 | Editor | Save/load content on page form |
| CMS-0612 | Featured image picker | P0 | todo | Frontend | CMS-0512 CMS-0610 | Image picker | Gan media image vao page |
| CMS-0613 | SEO panel | P0 | todo | Frontend/Backend | CMS-0210 CMS-0610 | SEO form | Meta title/description/canonical/OG |
| CMS-0614 | Page preview | P1 | todo | Frontend/Backend | CMS-0602 | Preview | Preview draft qua signed token/session |
| CMS-0615 | Page revision snapshot | P1 | todo | Backend | CMS-0222 CMS-0604 | Revisions | Tao revision khi update |
| CMS-0616 | Page revision UI | P2 | todo | Frontend | CMS-0615 | Revision UI | Xem/restore revision |
| CMS-0617 | Audit page actions | P1 | todo | Backend | CMS-0221 CMS-0603 | Audit logs | Create/update/delete/publish duoc log |

## Phase 7: Blog

| ID | Task | Priority | Status | Owner | Dependencies | Deliverable | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMS-0701 | API post list | P0 | todo | Backend | CMS-0214 CMS-0304 | Posts endpoint | Search/filter/status/category/tag |
| CMS-0702 | API post detail | P0 | todo | Backend | CMS-0214 | Posts endpoint | Tra post + relations + slug + seo |
| CMS-0703 | API create post | P0 | todo | Backend | CMS-0214 CMS-0209 | Posts endpoint | Tao post + slug + categories/tags |
| CMS-0704 | API update post | P0 | todo | Backend | CMS-0702 | Posts endpoint | Update content/relations/seo atomic |
| CMS-0705 | API delete post | P0 | todo | Backend | CMS-0702 | Posts endpoint | Delete/soft delete co permission |
| CMS-0706 | API category CRUD | P0 | todo | Backend | CMS-0215 | Categories endpoint | Category tree + status |
| CMS-0707 | API category reorder | P1 | todo | Backend | CMS-0706 | Reorder endpoint | Drag/drop luu order/parent |
| CMS-0708 | API tag CRUD | P0 | todo | Backend | CMS-0216 | Tags endpoint | Tag unique, search duoc |
| CMS-0709 | Post list UI | P0 | todo | Frontend | CMS-0701 | Blog UI | Table co filter category/tag/status |
| CMS-0710 | Post create/edit UI | P0 | todo | Frontend | CMS-0703 CMS-0704 | Post form | Editor, image, categories, tags, SEO |
| CMS-0711 | Category tree UI | P0 | todo | Frontend | CMS-0706 | Categories UI | Create/edit/delete nested categories |
| CMS-0712 | Category reorder UI | P1 | todo | Frontend | CMS-0707 | Drag/drop UI | Reorder tree luu dung |
| CMS-0713 | Tags UI | P0 | todo | Frontend | CMS-0708 | Tags UI | List/create/edit/delete tags |
| CMS-0714 | Related posts support | P2 | todo | Backend/Frontend | CMS-0704 | Related posts | Gan/xem related posts |
| CMS-0715 | Post view counter | P2 | todo | Backend | CMS-0702 | View tracking | Public post increment views |
| CMS-0716 | Post revision snapshot | P1 | todo | Backend | CMS-0222 CMS-0704 | Revisions | Tao revision khi update |
| CMS-0717 | Audit blog actions | P1 | todo | Backend | CMS-0221 CMS-0703 | Audit logs | CRUD/publish/category/tag duoc log |

## Phase 8: Menus And Navigation

| ID | Task | Priority | Status | Owner | Dependencies | Deliverable | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMS-0801 | API menu list | P0 | todo | Backend | CMS-0219 | Menus endpoint | List menu + location |
| CMS-0802 | API menu detail tree | P0 | todo | Backend | CMS-0220 | Menus endpoint | Tra nested nodes |
| CMS-0803 | API create/update menu | P0 | todo | Backend | CMS-0219 | Menus endpoint | Create/edit metadata |
| CMS-0804 | API save menu tree | P0 | todo | Backend | CMS-0220 | Tree endpoint | Save full tree atomic |
| CMS-0805 | API delete menu | P1 | todo | Backend | CMS-0219 | Menus endpoint | Delete menu + nodes |
| CMS-0806 | API linkable resources search | P0 | todo | Backend | CMS-0213 CMS-0214 CMS-0215 | Search endpoint | Search pages/posts/categories cho menu |
| CMS-0807 | Menu list UI | P0 | todo | Frontend | CMS-0801 | Menus UI | List/create/edit/delete |
| CMS-0808 | Menu builder UI | P0 | todo | Frontend | CMS-0802 CMS-0804 | Builder | Drag/drop nested nodes |
| CMS-0809 | Menu node editor | P0 | todo | Frontend | CMS-0806 | Node form | Custom URL/resource/title/target/icon/css |
| CMS-0810 | Menu location settings | P1 | todo | Frontend/Backend | CMS-0803 | Location UI | Gan menu vao header/footer/mobile |
| CMS-0811 | Audit menu actions | P1 | todo | Backend | CMS-0221 CMS-0803 | Audit logs | Save tree/create/delete duoc log |

## Phase 9: Public Content API

| ID | Task | Priority | Status | Owner | Dependencies | Deliverable | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMS-0901 | Public slug resolver | P0 | ready | Backend | CMS-0209 CMS-0603 CMS-0703 | Resolver endpoint | Resolve path ra entity published |
| CMS-0902 | Public page endpoint | P0 | todo | Backend | CMS-0602 | Public API | Chi tra page published/scheduled dung thoi diem |
| CMS-0903 | Public post list endpoint | P0 | todo | Backend | CMS-0701 | Public API | Pagination, filter category/tag |
| CMS-0904 | Public post detail endpoint | P0 | todo | Backend | CMS-0702 | Public API | Tra post published + SEO |
| CMS-0905 | Public category endpoint | P1 | todo | Backend | CMS-0706 | Public API | Tra category + posts |
| CMS-0906 | Public tag endpoint | P1 | todo | Backend | CMS-0708 | Public API | Tra tag + posts |
| CMS-0907 | Public menu endpoint | P0 | todo | Backend | CMS-0802 | Public API | Tra menu theo location |
| CMS-0908 | Public settings endpoint | P1 | todo | Backend | CMS-0208 | Public API | Tra site name/logo/theme options safe |
| CMS-0909 | Sitemap generation | P1 | todo | Backend | CMS-0901 | Sitemap XML | Includes published pages/posts/categories |
| CMS-0910 | Robots.txt support | P2 | todo | Backend | CMS-0909 | Robots endpoint | Configurable robots content |
| CMS-0911 | Cache public responses | P1 | todo | Backend | CMS-0901-CMS-0908 | Cache layer | Cache invalidate khi publish/update |

## Phase 10: Settings, SEO, Appearance

| ID | Task | Priority | Status | Owner | Dependencies | Deliverable | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMS-1001 | API settings get/update | P0 | todo | Backend | CMS-0208 CMS-0304 | Settings endpoint | Namespace settings, permission checked |
| CMS-1002 | General settings UI | P0 | todo | Frontend | CMS-1001 | Settings page | Site name, logo, favicon, timezone |
| CMS-1003 | SEO defaults settings | P1 | todo | Frontend/Backend | CMS-1001 CMS-0210 | SEO settings | Default meta/OG/social fallback |
| CMS-1004 | Media settings UI | P1 | todo | Frontend/Backend | CMS-1001 CMS-0501 | Media settings | File limits, allowed types |
| CMS-1005 | Admin appearance settings | P2 | todo | Frontend/Backend | CMS-1001 | Appearance settings | Sidebar mode, logo, theme color |
| CMS-1006 | Custom CSS support | P2 | todo | Backend/Frontend | CMS-1001 | Custom CSS setting | Permission protected, public safe output |
| CMS-1007 | Custom JS support | P3 | todo | Backend/Frontend | CMS-1001 | Custom JS setting | Permission protected, XSS risk reviewed |
| CMS-1008 | Email settings | P2 | todo | Backend/Frontend | CMS-1001 | Email config UI | SMTP/API provider test send |
| CMS-1009 | Cache settings | P2 | todo | Backend/Frontend | CMS-0911 | Cache UI | Clear cache button |
| CMS-1010 | Audit settings changes | P1 | todo | Backend | CMS-0221 CMS-1001 | Audit logs | Before/after settings changes logged |

## Phase 11: Audit Logs, Revisions, Operations

| ID | Task | Priority | Status | Owner | Dependencies | Deliverable | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMS-1101 | Audit log service | P1 | todo | Backend | CMS-0221 | Audit service | Reusable log writer |
| CMS-1102 | Audit log list API | P1 | todo | Backend | CMS-1101 | Endpoint | Filter user/action/entity/date |
| CMS-1103 | Audit log detail API | P1 | todo | Backend | CMS-1101 | Endpoint | View before/after JSON |
| CMS-1104 | Audit log UI | P1 | todo | Frontend | CMS-1102 | Audit page | Search/filter/detail drawer |
| CMS-1105 | Revision service | P1 | todo | Backend | CMS-0222 | Revision service | Snapshot entity changes |
| CMS-1106 | Revision list API | P1 | todo | Backend | CMS-1105 | Endpoint | List revisions by entity |
| CMS-1107 | Revision restore API | P2 | todo | Backend | CMS-1105 | Endpoint | Restore selected revision with permission |
| CMS-1108 | Revision UI | P2 | todo | Frontend | CMS-1106 CMS-1107 | Revision panel | View diff/restore |
| CMS-1109 | Request log middleware | P2 | todo | Backend | CMS-0112 | Request logs | Store failed/slow requests |
| CMS-1110 | Backup/export strategy | P2 | todo | Backend | CMS-0202 | Export plan | Export SQL/content/media metadata |
| CMS-1111 | Import content strategy | P3 | todo | Backend | CMS-1110 | Import plan | Import JSON/CSV/Markdown |

## Phase 12: Optional Plugins

| ID | Task | Priority | Status | Owner | Dependencies | Deliverable | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMS-1201 | Gallery module schema | P2 | todo | Backend | CMS-0501 | Gallery tables | Gallery + images + order |
| CMS-1202 | Gallery API | P2 | todo | Backend | CMS-1201 | Gallery endpoint | CRUD gallery/items |
| CMS-1203 | Gallery UI | P2 | todo | Frontend | CMS-1202 CMS-0512 | Gallery admin | Drag/drop images |
| CMS-1204 | Contact module schema | P2 | todo | Backend | CMS-0202 | Contact tables | Contacts + replies |
| CMS-1205 | Contact form public API | P2 | todo | Backend | CMS-1204 | Public endpoint | Submit contact, spam protection |
| CMS-1206 | Contact admin UI | P2 | todo | Frontend | CMS-1204 | Contacts page | Read/reply/archive/delete |
| CMS-1207 | Captcha integration | P2 | todo | Backend/Frontend | CMS-1205 | Captcha | hCaptcha/Turnstile setting |
| CMS-1208 | Member module | P3 | todo | Fullstack | CMS-0301 | Member feature | Public register/login/profile |
| CMS-1209 | Language module schema | P2 | todo | Backend | CMS-0202 | i18n tables | Languages + translation mappings |
| CMS-1210 | Multi-language content | P2 | todo | Fullstack | CMS-1209 | i18n content | Translate page/post/slug/menu |
| CMS-1211 | Translation management UI | P3 | todo | Frontend | CMS-1209 | Translation UI | Manage static translation keys |
| CMS-1212 | Analytics integration | P2 | todo | Backend/Frontend | CMS-1001 | Analytics page | GA/report dashboard |
| CMS-1213 | Cookie consent module | P3 | todo | Frontend | CMS-1001 | Cookie UI | Consent banner configurable |
| CMS-1214 | Social login settings | P3 | todo | Backend/Frontend | CMS-0301 | Social login | Google/GitHub provider config |

## Phase 13: Security, Quality, Performance

| ID | Task | Priority | Status | Owner | Dependencies | Deliverable | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMS-1301 | Threat model admin/API | P0 | ready | Security/Tech | CMS-0004 | Security notes | Auth, ACL, storage, XSS risks reviewed |
| CMS-1302 | Input validation with shared schemas | P0 | todo | Backend | CMS-0104 | Zod schemas | All write endpoints validated |
| CMS-1303 | HTML sanitization policy | P0 | ready | Backend/Frontend | CMS-0006 | Sanitizer | Prevent unsafe editor output |
| CMS-1304 | Rate limiting | P1 | todo | Backend | CMS-0103 | Rate limit middleware | Login/public forms protected |
| CMS-1305 | CORS policy | P0 | todo | Backend | CMS-0103 | CORS config | Only allowed origins |
| CMS-1306 | File upload security review | P0 | ready | Backend | CMS-0502 | Security fixes | MIME sniffing, extension rules, size limit |
| CMS-1307 | Permission coverage tests | P0 | todo | Backend | CMS-0304 | Tests | Protected endpoints reject missing permission |
| CMS-1308 | API integration tests | P1 | todo | Backend | CMS-0601 CMS-0701 | Tests | Cover core CRUD flows |
| CMS-1309 | Frontend smoke tests | P1 | todo | Frontend | CMS-0401 | Tests | Login/list/create/edit smoke flows |
| CMS-1310 | Accessibility pass | P1 | todo | Frontend | CMS-0401-CMS-0713 | A11y checklist | Keyboard/focus/contrast labels pass |
| CMS-1311 | Performance budget | P2 | todo | Frontend/Backend | CMS-0901 | Perf doc | Admin bundle/public API budgets |
| CMS-1312 | Query optimization | P1 | todo | Backend | CMS-0214 CMS-0901 | Index/query pass | Main list endpoints performant |
| CMS-1313 | Error monitoring setup | P2 | todo | DevOps | CMS-0103 | Monitoring | Sentry/Logtail/etc configured |
| CMS-1314 | Backup/restore drill | P2 | todo | DevOps | CMS-1110 | Runbook | Restore tested in staging |

## Phase 14: Release And Documentation

| ID | Task | Priority | Status | Owner | Dependencies | Deliverable | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CMS-1401 | Admin user guide | P1 | todo | Product | CMS-0609 CMS-0709 CMS-0509 | Documentation | Huong dan pages/posts/media/menu |
| CMS-1402 | Developer setup guide | P0 | ready | Tech | CMS-0101 | README | Setup local env ro rang |
| CMS-1403 | API documentation | P1 | todo | Backend | CMS-0901 | API docs | Auth, admin, public endpoints documented |
| CMS-1404 | Database schema documentation | P1 | todo | Backend | CMS-0203-CMS-0222 | Schema docs | Tables/relations/indexes explained |
| CMS-1405 | Deployment runbook | P1 | ready | DevOps | CMS-0005 | Runbook | Env, migrations, deploy, rollback |
| CMS-1406 | MVP QA checklist | P0 | todo | QA/Product | CMS-0609 CMS-0709 CMS-0808 CMS-0901 | QA checklist | Core flows verified |
| CMS-1407 | Seed production admin | P0 | todo | DevOps | CMS-0301 | Admin account | Admin login works in production |
| CMS-1408 | Release notes v0.1 | P1 | todo | Product/Tech | CMS-1406 | Release notes | Known issues + included features |
| CMS-1409 | Post-release bug triage board | P1 | todo | Product | CMS-1408 | Bug board | Co process ghi nhan/fix loi |

## MVP Cut

Nhung task bat buoc de coi la MVP:

| Area | Required Tasks |
| --- | --- |
| Foundation | CMS-0001 to CMS-0009, CMS-0101 to CMS-0113 |
| Database | CMS-0201 to CMS-0227 |
| Auth/ACL | CMS-0301 to CMS-0316 |
| Admin Shell | CMS-0401, CMS-0402, CMS-0405, CMS-0407, CMS-0408, CMS-0410, CMS-0411, CMS-0412 |
| Media | CMS-0501 to CMS-0512 |
| Pages | CMS-0601 to CMS-0613 |
| Blog | CMS-0701 to CMS-0713 |
| Menus | CMS-0801 to CMS-0809 |
| Public API | CMS-0901 to CMS-0908 |
| Settings | CMS-1001, CMS-1002 |
| Security | CMS-1301 to CMS-1307 |
| Release | CMS-1402, CMS-1406, CMS-1407 |

## Permission Matrix Draft

| Module | Permission |
| --- | --- |
| System | `core.system` |
| Settings | `settings.index` |
| Settings | `settings.general` |
| Settings | `settings.seo` |
| Settings | `settings.media` |
| Users | `users.index` |
| Users | `users.create` |
| Users | `users.edit` |
| Users | `users.delete` |
| Roles | `roles.index` |
| Roles | `roles.create` |
| Roles | `roles.edit` |
| Roles | `roles.delete` |
| Media | `media.index` |
| Media | `media.upload` |
| Media | `media.edit` |
| Media | `media.delete` |
| Pages | `pages.index` |
| Pages | `pages.create` |
| Pages | `pages.edit` |
| Pages | `pages.delete` |
| Pages | `pages.publish` |
| Blog | `blog.index` |
| Posts | `posts.index` |
| Posts | `posts.create` |
| Posts | `posts.edit` |
| Posts | `posts.delete` |
| Posts | `posts.publish` |
| Categories | `categories.index` |
| Categories | `categories.create` |
| Categories | `categories.edit` |
| Categories | `categories.delete` |
| Tags | `tags.index` |
| Tags | `tags.create` |
| Tags | `tags.edit` |
| Tags | `tags.delete` |
| Menus | `menus.index` |
| Menus | `menus.create` |
| Menus | `menus.edit` |
| Menus | `menus.delete` |
| Audit Logs | `audit_logs.index` |
| Audit Logs | `audit_logs.delete` |
| Revisions | `revisions.index` |
| Revisions | `revisions.restore` |

## Recommended First Sprint

| Sprint Task | Included IDs |
| --- | --- |
| Scaffold repo | CMS-0101, CMS-0102, CMS-0103, CMS-0104, CMS-0106, CMS-0107, CMS-0108, CMS-0110 |
| Supabase foundation | CMS-0201, CMS-0202, CMS-0203, CMS-0204, CMS-0205, CMS-0206, CMS-0207, CMS-0226, CMS-0227 |
| Auth vertical slice | CMS-0301, CMS-0302, CMS-0303, CMS-0304, CMS-0305, CMS-0311, CMS-0312, CMS-0313 |
| Admin shell | CMS-0401, CMS-0402, CMS-0410, CMS-0411 |
