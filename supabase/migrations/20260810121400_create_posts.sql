create table if not exists public.posts (
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
  views_count bigint not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_title_not_blank check (btrim(title) <> ''),
  constraint posts_content_version_positive check (content_version > 0),
  constraint posts_views_count_non_negative check (views_count >= 0),
  constraint posts_status_check check (
    status in ('draft', 'published', 'scheduled', 'archived', 'deleted')
  )
);

create index if not exists posts_status_published_at_idx
  on public.posts (status, published_at desc);

create index if not exists posts_author_id_idx on public.posts (author_id);

create index if not exists posts_featured_image_id_idx
  on public.posts (featured_image_id);

create index if not exists posts_deleted_at_idx on public.posts (deleted_at);

create index if not exists posts_views_count_idx on public.posts (views_count desc);

create index if not exists posts_created_at_idx on public.posts (created_at desc);

drop trigger if exists set_posts_updated_at on public.posts;

create trigger set_posts_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

alter table public.posts enable row level security;
