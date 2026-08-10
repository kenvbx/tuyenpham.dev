insert into public.pages (
  id,
  title,
  excerpt,
  content_json,
  content_html,
  content_text,
  content_version,
  status,
  published_at
)
values (
  '10000000-0000-4000-8000-000000000001',
  'About',
  'A starter page for the CMS public resolver.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Welcome to the sample CMS page."}]}]}'::jsonb,
  '<p>Welcome to the sample CMS page.</p>',
  'Welcome to the sample CMS page.',
  1,
  'published',
  '2026-08-10 00:00:00+00'
)
on conflict (id) do update
set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content_json = excluded.content_json,
  content_html = excluded.content_html,
  content_text = excluded.content_text,
  content_version = excluded.content_version,
  status = excluded.status,
  published_at = excluded.published_at,
  updated_at = now();

insert into public.categories (
  id,
  name,
  description,
  sort_order,
  status
)
values (
  '10000000-0000-4000-8000-000000000002',
  'News',
  'Sample category for demo blog posts.',
  0,
  'published'
)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  status = excluded.status,
  updated_at = now();

insert into public.tags (
  id,
  name,
  slug,
  description,
  status
)
values (
  '10000000-0000-4000-8000-000000000003',
  'CMS',
  'cms',
  'Sample tag for CMS demo content.',
  'published'
)
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  status = excluded.status,
  updated_at = now();

insert into public.posts (
  id,
  title,
  excerpt,
  content_json,
  content_html,
  content_text,
  content_version,
  status,
  published_at
)
values (
  '10000000-0000-4000-8000-000000000004',
  'Hello CMS',
  'A starter blog post for the CMS demo dataset.',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This is the first sample blog post."}]}]}'::jsonb,
  '<p>This is the first sample blog post.</p>',
  'This is the first sample blog post.',
  1,
  'published',
  '2026-08-10 00:00:00+00'
)
on conflict (id) do update
set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content_json = excluded.content_json,
  content_html = excluded.content_html,
  content_text = excluded.content_text,
  content_version = excluded.content_version,
  status = excluded.status,
  published_at = excluded.published_at,
  updated_at = now();

insert into public.post_categories (post_id, category_id, sort_order)
values (
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000002',
  0
)
on conflict (post_id, category_id) do update
set sort_order = excluded.sort_order;

insert into public.post_tags (post_id, tag_id)
values (
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000003'
)
on conflict (post_id, tag_id) do nothing;

insert into public.slugs (
  key,
  prefix,
  locale,
  reference_type,
  reference_id,
  is_active
)
values
  (
    'about',
    '',
    'vi',
    'page',
    '10000000-0000-4000-8000-000000000001',
    true
  ),
  (
    'news',
    'category',
    'vi',
    'category',
    '10000000-0000-4000-8000-000000000002',
    true
  ),
  (
    'cms',
    'tag',
    'vi',
    'tag',
    '10000000-0000-4000-8000-000000000003',
    true
  ),
  (
    'hello-cms',
    'blog',
    'vi',
    'blog-post',
    '10000000-0000-4000-8000-000000000004',
    true
  )
on conflict (key, prefix, locale) where is_active = true do update
set
  reference_type = excluded.reference_type,
  reference_id = excluded.reference_id,
  is_active = excluded.is_active,
  redirect_to = null,
  updated_at = now();

insert into public.seo_meta (
  entity_type,
  entity_id,
  meta_title,
  meta_description,
  og_title,
  og_description
)
values
  (
    'page',
    '10000000-0000-4000-8000-000000000001',
    'About',
    'A starter page for the CMS public resolver.',
    'About',
    'A starter page for the CMS public resolver.'
  ),
  (
    'blog-post',
    '10000000-0000-4000-8000-000000000004',
    'Hello CMS',
    'A starter blog post for the CMS demo dataset.',
    'Hello CMS',
    'A starter blog post for the CMS demo dataset.'
  )
on conflict (entity_type, entity_id) do update
set
  meta_title = excluded.meta_title,
  meta_description = excluded.meta_description,
  og_title = excluded.og_title,
  og_description = excluded.og_description,
  updated_at = now();

insert into public.menus (
  id,
  name,
  slug,
  location,
  description,
  status
)
values (
  '10000000-0000-4000-8000-000000000005',
  'Header Menu',
  'header-menu',
  'header',
  'Sample header navigation menu.',
  'active'
)
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  location = excluded.location,
  description = excluded.description,
  status = excluded.status,
  updated_at = now();

insert into public.menu_nodes (
  id,
  menu_id,
  parent_id,
  title,
  link_type,
  url,
  resource_type,
  resource_id,
  target,
  sort_order,
  status
)
values
  (
    '10000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000005',
    null,
    'About',
    'page',
    null,
    'page',
    '10000000-0000-4000-8000-000000000001',
    '_self',
    0,
    'active'
  ),
  (
    '10000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000005',
    null,
    'Blog',
    'custom',
    '/blog',
    null,
    null,
    '_self',
    1,
    'active'
  )
on conflict (id) do update
set
  menu_id = excluded.menu_id,
  parent_id = excluded.parent_id,
  title = excluded.title,
  link_type = excluded.link_type,
  url = excluded.url,
  resource_type = excluded.resource_type,
  resource_id = excluded.resource_id,
  target = excluded.target,
  sort_order = excluded.sort_order,
  status = excluded.status,
  updated_at = now();
