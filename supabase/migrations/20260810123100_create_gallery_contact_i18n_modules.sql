create table if not exists public.galleries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  status text not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint galleries_name_not_blank check (btrim(name) <> ''),
  constraint galleries_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint galleries_status_check check (status in ('draft', 'published', 'archived', 'deleted'))
);

create unique index if not exists galleries_slug_unique
  on public.galleries (slug)
  where deleted_at is null;

create index if not exists galleries_status_idx on public.galleries (status);

drop trigger if exists set_galleries_updated_at on public.galleries;
create trigger set_galleries_updated_at
before update on public.galleries
for each row
execute function public.set_updated_at();

alter table public.galleries enable row level security;

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries (id) on delete cascade,
  media_file_id uuid references public.media_files (id) on delete set null,
  title text,
  alt text,
  caption text,
  link_url text,
  sort_order integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gallery_items_link_url_format check (
    link_url is null or link_url ~ '^https?://[^[:space:]]+$'
  )
);

create index if not exists gallery_items_gallery_sort_idx
  on public.gallery_items (gallery_id, sort_order, created_at);

drop trigger if exists set_gallery_items_updated_at on public.gallery_items;
create trigger set_gallery_items_updated_at
before update on public.gallery_items
for each row
execute function public.set_updated_at();

alter table public.gallery_items enable row level security;

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  status text not null default 'new',
  source text not null default 'contact-form',
  captcha_provider text,
  captcha_passed boolean not null default false,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_submissions_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint contact_submissions_status_check check (
    status in ('new', 'read', 'replied', 'archived', 'deleted')
  ),
  constraint contact_submissions_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists contact_submissions_status_created_idx
  on public.contact_submissions (status, created_at desc);

drop trigger if exists set_contact_submissions_updated_at on public.contact_submissions;
create trigger set_contact_submissions_updated_at
before update on public.contact_submissions
for each row
execute function public.set_updated_at();

alter table public.contact_submissions enable row level security;

create table if not exists public.contact_replies (
  id uuid primary key default gen_random_uuid(),
  contact_submission_id uuid not null references public.contact_submissions (id) on delete cascade,
  body text not null,
  sent_by uuid references public.profiles (id) on delete set null,
  sent_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint contact_replies_body_not_blank check (btrim(body) <> ''),
  constraint contact_replies_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists contact_replies_submission_sent_idx
  on public.contact_replies (contact_submission_id, sent_at desc);

alter table public.contact_replies enable row level security;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  display_name text,
  status text not null default 'active',
  profile jsonb not null default '{}'::jsonb,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint members_status_check check (status in ('active', 'inactive', 'suspended')),
  constraint members_profile_is_object check (jsonb_typeof(profile) = 'object')
);

drop trigger if exists set_members_updated_at on public.members;
create trigger set_members_updated_at
before update on public.members
for each row
execute function public.set_updated_at();

alter table public.members enable row level security;

create table if not exists public.languages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  native_name text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint languages_code_format check (code ~ '^[a-z]{2}(?:-[a-z]{2})?$'),
  constraint languages_name_not_blank check (btrim(name) <> '')
);

create unique index if not exists languages_single_default_unique
  on public.languages (is_default)
  where is_default = true;

drop trigger if exists set_languages_updated_at on public.languages;
create trigger set_languages_updated_at
before update on public.languages
for each row
execute function public.set_updated_at();

alter table public.languages enable row level security;

insert into public.languages (code, name, native_name, is_default, is_active, sort_order)
values ('vi', 'Vietnamese', 'Tiếng Việt', true, true, 0)
on conflict (code) do nothing;

create table if not exists public.translation_keys (
  id uuid primary key default gen_random_uuid(),
  namespace text not null default 'common',
  key text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint translation_keys_namespace_format check (
    namespace ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint translation_keys_key_not_blank check (btrim(key) <> '')
);

create unique index if not exists translation_keys_namespace_key_unique
  on public.translation_keys (namespace, key);

drop trigger if exists set_translation_keys_updated_at on public.translation_keys;
create trigger set_translation_keys_updated_at
before update on public.translation_keys
for each row
execute function public.set_updated_at();

alter table public.translation_keys enable row level security;

create table if not exists public.translations (
  id uuid primary key default gen_random_uuid(),
  translation_key_id uuid not null references public.translation_keys (id) on delete cascade,
  language_code text not null references public.languages (code) on delete cascade,
  value text not null default '',
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (translation_key_id, language_code)
);

drop trigger if exists set_translations_updated_at on public.translations;
create trigger set_translations_updated_at
before update on public.translations
for each row
execute function public.set_updated_at();

alter table public.translations enable row level security;

create table if not exists public.content_translations (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id uuid not null,
  language_code text not null references public.languages (code) on delete cascade,
  translated_type text not null,
  translated_id uuid not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint content_translations_type_check check (
    source_type in ('page', 'post', 'menu') and translated_type in ('page', 'post', 'menu')
  )
);

create unique index if not exists content_translations_unique
  on public.content_translations (source_type, source_id, language_code);

alter table public.content_translations enable row level security;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  path text,
  referrer text,
  visitor_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_name_not_blank check (btrim(event_name) <> ''),
  constraint analytics_events_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists analytics_events_name_created_idx
  on public.analytics_events (event_name, created_at desc);

create index if not exists analytics_events_created_idx
  on public.analytics_events (created_at desc);

alter table public.analytics_events enable row level security;
