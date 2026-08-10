create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  namespace text not null,
  key text not null,
  value jsonb not null default 'null'::jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint settings_namespace_not_blank check (btrim(namespace) <> ''),
  constraint settings_namespace_format check (
    namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint settings_key_not_blank check (btrim(key) <> ''),
  constraint settings_key_format check (key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists settings_namespace_key_unique
  on public.settings (namespace, key);

create index if not exists settings_namespace_idx on public.settings (namespace);

create index if not exists settings_is_public_idx on public.settings (is_public)
where is_public = true;

drop trigger if exists set_settings_updated_at on public.settings;

create trigger set_settings_updated_at
before update on public.settings
for each row
execute function public.set_updated_at();

alter table public.settings enable row level security;
