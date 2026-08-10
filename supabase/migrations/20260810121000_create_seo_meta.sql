create table if not exists public.seo_meta (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  meta_title text,
  meta_description text,
  canonical_url text,
  og_title text,
  og_description text,
  og_image_id uuid,
  og_image_url text,
  noindex boolean not null default false,
  nofollow boolean not null default false,
  structured_data jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_meta_entity_type_not_blank check (btrim(entity_type) <> ''),
  constraint seo_meta_entity_type_check check (
    entity_type in ('page', 'blog-post', 'category', 'tag')
  ),
  constraint seo_meta_meta_title_length check (
    meta_title is null or char_length(meta_title) <= 160
  ),
  constraint seo_meta_meta_description_length check (
    meta_description is null or char_length(meta_description) <= 320
  ),
  constraint seo_meta_canonical_url_format check (
    canonical_url is null or canonical_url ~ '^https?://[^[:space:]]+$'
  ),
  constraint seo_meta_og_image_url_format check (
    og_image_url is null or og_image_url ~ '^https?://[^[:space:]]+$'
  )
);

create unique index if not exists seo_meta_entity_unique
  on public.seo_meta (entity_type, entity_id);

create index if not exists seo_meta_og_image_id_idx on public.seo_meta (og_image_id);

create index if not exists seo_meta_created_by_idx on public.seo_meta (created_by);

create index if not exists seo_meta_updated_by_idx on public.seo_meta (updated_by);

drop trigger if exists set_seo_meta_updated_at on public.seo_meta;

create trigger set_seo_meta_updated_at
before update on public.seo_meta
for each row
execute function public.set_updated_at();

alter table public.seo_meta enable row level security;
