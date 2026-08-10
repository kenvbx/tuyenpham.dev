create index if not exists slugs_active_resolver_idx
  on public.slugs (prefix, key, locale)
  include (reference_type, reference_id)
  where is_active = true;

create index if not exists slugs_redirect_resolver_idx
  on public.slugs (prefix, key, locale)
  include (redirect_to, reference_type, reference_id)
  where is_active = false and redirect_to is not null;

create index if not exists pages_public_published_idx
  on public.pages (published_at desc, id)
  where status = 'published' and deleted_at is null;

create index if not exists posts_public_published_idx
  on public.posts (published_at desc, id)
  where status = 'published' and deleted_at is null;

create index if not exists pages_author_status_published_at_idx
  on public.pages (author_id, status, published_at desc)
  where deleted_at is null;

create index if not exists posts_author_status_published_at_idx
  on public.posts (author_id, status, published_at desc)
  where deleted_at is null;

create index if not exists pages_status_updated_at_idx
  on public.pages (status, updated_at desc)
  where deleted_at is null;

create index if not exists posts_status_updated_at_idx
  on public.posts (status, updated_at desc)
  where deleted_at is null;

create index if not exists categories_public_tree_idx
  on public.categories (parent_id, sort_order)
  where status = 'published' and deleted_at is null;

create index if not exists tags_public_slug_idx
  on public.tags (slug)
  where status = 'published' and deleted_at is null;

create index if not exists seo_meta_entity_public_lookup_idx
  on public.seo_meta (entity_type, entity_id);
