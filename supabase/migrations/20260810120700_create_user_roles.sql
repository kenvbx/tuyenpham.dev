create table if not exists public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index if not exists user_roles_role_id_idx on public.user_roles (role_id);

alter table public.user_roles enable row level security;
