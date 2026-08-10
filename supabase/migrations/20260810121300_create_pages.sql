create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text,
  content_json jsonb,
  content_html text,
  content_text text,
  content_version integer not null default 1,
  featured_image_id uuid references public.media_files (id) on delete set null,
  author_id uuid references public.profiles (id) on delete set null,
  status text not null default 'draft',
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pages_title_not_blank check (btrim(title) <> ''),
  constraint pages_content_version_positive check (content_version > 0),
  constraint pages_status_check check (
    status in ('draft', 'published', 'scheduled', 'archived', 'deleted')
  )
);

create index if not exists pages_status_published_at_idx
  on public.pages (status, published_at desc);

create index if not exists pages_author_id_idx on public.pages (author_id);

create index if not exists pages_featured_image_id_idx
  on public.pages (featured_image_id);

create index if not exists pages_deleted_at_idx on public.pages (deleted_at);

create index if not exists pages_created_at_idx on public.pages (created_at desc);

drop trigger if exists set_pages_updated_at on public.pages;

create trigger set_pages_updated_at
before update on public.pages
for each row
execute function public.set_updated_at();

alter table public.pages enable row level security;
