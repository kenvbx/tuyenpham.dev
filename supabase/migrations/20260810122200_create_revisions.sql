create table if not exists public.revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  revision_number integer not null,
  title text,
  snapshot jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint revisions_entity_type_check check (
    entity_type in ('page', 'post', 'setting')
  ),
  constraint revisions_revision_number_positive check (revision_number > 0),
  constraint revisions_snapshot_is_object check (jsonb_typeof(snapshot) = 'object'),
  constraint revisions_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists revisions_entity_revision_number_unique
  on public.revisions (entity_type, entity_id, revision_number);

create index if not exists revisions_entity_created_at_idx
  on public.revisions (entity_type, entity_id, created_at desc);

create index if not exists revisions_created_by_idx
  on public.revisions (created_by);

create index if not exists revisions_created_at_idx
  on public.revisions (created_at desc);

create index if not exists revisions_snapshot_gin_idx
  on public.revisions using gin (snapshot);

create index if not exists revisions_metadata_gin_idx
  on public.revisions using gin (metadata);

alter table public.revisions enable row level security;
