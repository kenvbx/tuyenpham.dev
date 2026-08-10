create extension if not exists pgcrypto;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text,
  is_system boolean not null default false,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_slug_not_blank check (btrim(slug) <> ''),
  constraint roles_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint roles_name_not_blank check (btrim(name) <> '')
);

create unique index if not exists roles_slug_unique on public.roles (slug);

create index if not exists roles_is_system_idx on public.roles (is_system);

create index if not exists roles_is_default_idx on public.roles (is_default);

drop trigger if exists set_roles_updated_at on public.roles;

create trigger set_roles_updated_at
before update on public.roles
for each row
execute function public.set_updated_at();

alter table public.roles enable row level security;
