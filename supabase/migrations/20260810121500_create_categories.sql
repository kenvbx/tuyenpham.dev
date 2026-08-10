create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  parent_id uuid references public.categories (id) on delete restrict,
  sort_order integer not null default 0,
  status text not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_blank check (btrim(name) <> ''),
  constraint categories_sort_order_non_negative check (sort_order >= 0),
  constraint categories_status_check check (
    status in ('draft', 'published', 'scheduled', 'archived', 'deleted')
  ),
  constraint categories_parent_not_self check (parent_id is null or parent_id <> id)
);

create index if not exists categories_parent_id_idx on public.categories (parent_id);

create index if not exists categories_status_sort_order_idx
  on public.categories (status, sort_order);

create index if not exists categories_deleted_at_idx on public.categories (deleted_at);

create index if not exists categories_created_by_idx on public.categories (created_by);

create index if not exists categories_updated_by_idx on public.categories (updated_by);

drop trigger if exists set_categories_updated_at on public.categories;

create trigger set_categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

alter table public.categories enable row level security;
