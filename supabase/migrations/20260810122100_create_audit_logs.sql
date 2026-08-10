create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  request_id text,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_not_blank check (btrim(action) <> ''),
  constraint audit_logs_entity_type_not_blank check (btrim(entity_type) <> ''),
  constraint audit_logs_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists audit_logs_actor_id_idx
  on public.audit_logs (actor_id);

create index if not exists audit_logs_action_idx
  on public.audit_logs (action);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_request_id_idx
  on public.audit_logs (request_id);

create index if not exists audit_logs_metadata_gin_idx
  on public.audit_logs using gin (metadata);

alter table public.audit_logs enable row level security;
