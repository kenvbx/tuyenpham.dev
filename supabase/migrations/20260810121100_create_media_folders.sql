create table if not exists public.media_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  parent_id uuid references public.media_folders (id) on delete restrict,
  color text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_folders_name_not_blank check (btrim(name) <> ''),
  constraint media_folders_slug_not_blank check (btrim(slug) <> ''),
  constraint media_folders_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint media_folders_color_format check (
    color is null or color ~ '^#[0-9a-fA-F]{6}$'
  ),
  constraint media_folders_parent_not_self check (parent_id is null or parent_id <> id)
);

create unique index if not exists media_folders_parent_slug_active_unique
  on public.media_folders (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug)
  where deleted_at is null;

create index if not exists media_folders_parent_id_idx
  on public.media_folders (parent_id);

create index if not exists media_folders_deleted_at_idx
  on public.media_folders (deleted_at);

create index if not exists media_folders_created_by_idx
  on public.media_folders (created_by);

create index if not exists media_folders_updated_by_idx
  on public.media_folders (updated_by);

drop trigger if exists set_media_folders_updated_at on public.media_folders;

create trigger set_media_folders_updated_at
before update on public.media_folders
for each row
execute function public.set_updated_at();

alter table public.media_folders enable row level security;
