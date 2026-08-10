create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  status text not null default 'published',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_name_not_blank check (btrim(name) <> ''),
  constraint tags_slug_not_blank check (btrim(slug) <> ''),
  constraint tags_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint tags_status_check check (
    status in ('draft', 'published', 'scheduled', 'archived', 'deleted')
  )
);

create unique index if not exists tags_slug_unique on public.tags (slug);

create unique index if not exists tags_name_lower_unique on public.tags (lower(name));

create index if not exists tags_status_idx on public.tags (status);

create index if not exists tags_deleted_at_idx on public.tags (deleted_at);

create index if not exists tags_created_by_idx on public.tags (created_by);

create index if not exists tags_updated_by_idx on public.tags (updated_by);

drop trigger if exists set_tags_updated_at on public.tags;

create trigger set_tags_updated_at
before update on public.tags
for each row
execute function public.set_updated_at();

alter table public.tags enable row level security;
