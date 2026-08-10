create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  location text not null,
  description text,
  status text not null default 'active',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menus_name_not_blank check (btrim(name) <> ''),
  constraint menus_slug_not_blank check (btrim(slug) <> ''),
  constraint menus_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint menus_location_not_blank check (btrim(location) <> ''),
  constraint menus_location_format check (location ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint menus_status_check check (
    status in ('active', 'inactive', 'archived', 'deleted')
  )
);

create unique index if not exists menus_slug_unique on public.menus (slug);

create unique index if not exists menus_location_unique on public.menus (location);

create index if not exists menus_status_idx on public.menus (status);

create index if not exists menus_deleted_at_idx on public.menus (deleted_at);

create index if not exists menus_created_by_idx on public.menus (created_by);

create index if not exists menus_updated_by_idx on public.menus (updated_by);

drop trigger if exists set_menus_updated_at on public.menus;

create trigger set_menus_updated_at
before update on public.menus
for each row
execute function public.set_updated_at();

alter table public.menus enable row level security;
