create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'system',
  severity text not null default 'info',
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint admin_notifications_title_not_blank check (btrim(title) <> ''),
  constraint admin_notifications_type_check check (
    type in ('system', 'auth', 'content', 'media', 'menu', 'settings')
  ),
  constraint admin_notifications_severity_check check (
    severity in ('info', 'success', 'warning', 'error')
  ),
  constraint admin_notifications_metadata_is_object check (
    jsonb_typeof(metadata) = 'object'
  )
);

create index if not exists admin_notifications_recipient_created_at_idx
  on public.admin_notifications (recipient_id, created_at desc);

create index if not exists admin_notifications_unread_idx
  on public.admin_notifications (recipient_id, created_at desc)
  where read_at is null and deleted_at is null;

create index if not exists admin_notifications_type_idx
  on public.admin_notifications (type);

create index if not exists admin_notifications_severity_idx
  on public.admin_notifications (severity);

create index if not exists admin_notifications_read_at_idx
  on public.admin_notifications (read_at);

create index if not exists admin_notifications_archived_at_idx
  on public.admin_notifications (archived_at);

create index if not exists admin_notifications_deleted_at_idx
  on public.admin_notifications (deleted_at);

create index if not exists admin_notifications_metadata_gin_idx
  on public.admin_notifications using gin (metadata);

alter table public.admin_notifications enable row level security;
