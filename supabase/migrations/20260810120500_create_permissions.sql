create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  flag text not null,
  name text not null,
  group_name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint permissions_flag_not_blank check (btrim(flag) <> ''),
  constraint permissions_flag_format check (
    flag ~ '^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint permissions_name_not_blank check (btrim(name) <> ''),
  constraint permissions_group_name_not_blank check (btrim(group_name) <> '')
);

create unique index if not exists permissions_flag_unique on public.permissions (flag);

create index if not exists permissions_group_name_idx on public.permissions (group_name);

create index if not exists permissions_is_system_idx on public.permissions (is_system);

drop trigger if exists set_permissions_updated_at on public.permissions;

create trigger set_permissions_updated_at
before update on public.permissions
for each row
execute function public.set_updated_at();

alter table public.permissions enable row level security;
