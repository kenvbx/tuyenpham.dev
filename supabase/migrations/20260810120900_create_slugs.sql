create table if not exists public.slugs (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  prefix text not null default '',
  locale text not null default 'vi',
  reference_type text not null,
  reference_id uuid not null,
  is_active boolean not null default true,
  redirect_to text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slugs_key_not_blank check (btrim(key) <> ''),
  constraint slugs_key_length check (char_length(key) <= 160),
  constraint slugs_key_format check (key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint slugs_prefix_format check (
    prefix = '' or prefix ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint slugs_locale_format check (locale ~ '^[a-z]{2}(?:-[a-z]{2})?$'),
  constraint slugs_reference_type_check check (
    reference_type in ('page', 'blog-post', 'category', 'tag')
  ),
  constraint slugs_redirect_to_format check (
    redirect_to is null or redirect_to ~ '^/[^[:space:]]*$'
  )
);

create unique index if not exists uniq_slugs_key_prefix_locale_active
  on public.slugs (key, prefix, locale)
  where is_active = true;

create index if not exists idx_slugs_reference
  on public.slugs (reference_type, reference_id);

create index if not exists idx_slugs_lookup
  on public.slugs (prefix, key, locale, is_active);

create index if not exists idx_slugs_created_by
  on public.slugs (created_by);

create index if not exists idx_slugs_updated_by
  on public.slugs (updated_by);

drop trigger if exists set_slugs_updated_at on public.slugs;

create trigger set_slugs_updated_at
before update on public.slugs
for each row
execute function public.set_updated_at();

alter table public.slugs enable row level security;
