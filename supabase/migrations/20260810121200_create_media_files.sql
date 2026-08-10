create table if not exists public.media_files (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.media_folders (id) on delete restrict,
  uploaded_by uuid references public.profiles (id) on delete set null,
  name text not null,
  original_name text not null,
  alt text,
  caption text,
  mime_type text not null,
  extension text not null,
  size_bytes bigint not null,
  width integer,
  height integer,
  duration_seconds integer,
  bucket text not null,
  object_path text not null,
  url text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_files_name_not_blank check (btrim(name) <> ''),
  constraint media_files_original_name_not_blank check (btrim(original_name) <> ''),
  constraint media_files_mime_type_not_blank check (btrim(mime_type) <> ''),
  constraint media_files_extension_format check (extension ~ '^[a-z0-9]+$'),
  constraint media_files_size_bytes_positive check (size_bytes > 0),
  constraint media_files_width_positive check (width is null or width > 0),
  constraint media_files_height_positive check (height is null or height > 0),
  constraint media_files_duration_seconds_positive check (
    duration_seconds is null or duration_seconds > 0
  ),
  constraint media_files_bucket_not_blank check (btrim(bucket) <> ''),
  constraint media_files_object_path_not_blank check (btrim(object_path) <> ''),
  constraint media_files_url_format check (url ~ '^https?://[^[:space:]]+$'),
  constraint media_files_status_check check (
    status in ('active', 'trashed', 'deleted', 'quarantined')
  )
);

create unique index if not exists media_files_object_path_unique
  on public.media_files (object_path);

create index if not exists media_files_folder_id_idx on public.media_files (folder_id);

create index if not exists media_files_uploaded_by_idx on public.media_files (uploaded_by);

create index if not exists media_files_mime_type_idx on public.media_files (mime_type);

create index if not exists media_files_status_idx on public.media_files (status);

create index if not exists media_files_deleted_at_idx on public.media_files (deleted_at);

create index if not exists media_files_created_at_idx on public.media_files (created_at desc);

drop trigger if exists set_media_files_updated_at on public.media_files;

create trigger set_media_files_updated_at
before update on public.media_files
for each row
execute function public.set_updated_at();

alter table public.media_files enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_avatar_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_avatar_id_fkey
      foreign key (avatar_id) references public.media_files (id) on delete set null;
  end if;
end;
$$;

create index if not exists profiles_avatar_id_idx on public.profiles (avatar_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'seo_meta_og_image_id_fkey'
  ) then
    alter table public.seo_meta
      add constraint seo_meta_og_image_id_fkey
      foreign key (og_image_id) references public.media_files (id) on delete set null;
  end if;
end;
$$;
