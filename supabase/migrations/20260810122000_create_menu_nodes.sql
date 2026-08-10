create table if not exists public.menu_nodes (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus (id) on delete cascade,
  parent_id uuid references public.menu_nodes (id) on delete cascade,
  title text not null,
  link_type text not null default 'custom',
  url text,
  resource_type text,
  resource_id uuid,
  target text not null default '_self',
  rel text,
  icon text,
  css_class text,
  sort_order integer not null default 0,
  status text not null default 'active',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_nodes_title_not_blank check (btrim(title) <> ''),
  constraint menu_nodes_link_type_check check (
    link_type in ('custom', 'page', 'post', 'category', 'tag', 'label')
  ),
  constraint menu_nodes_resource_type_check check (
    resource_type is null
    or resource_type in ('page', 'post', 'category', 'tag')
  ),
  constraint menu_nodes_link_payload_check check (
    (
      link_type = 'custom'
      and url is not null
      and btrim(url) <> ''
      and resource_type is null
      and resource_id is null
    )
    or (
      link_type in ('page', 'post', 'category', 'tag')
      and url is null
      and resource_type = link_type
      and resource_id is not null
    )
    or (
      link_type = 'label'
      and url is null
      and resource_type is null
      and resource_id is null
    )
  ),
  constraint menu_nodes_target_check check (target in ('_self', '_blank')),
  constraint menu_nodes_sort_order_non_negative check (sort_order >= 0),
  constraint menu_nodes_status_check check (
    status in ('active', 'inactive', 'archived', 'deleted')
  ),
  constraint menu_nodes_parent_not_self check (parent_id is null or parent_id <> id)
);

create index if not exists menu_nodes_menu_parent_sort_order_idx
  on public.menu_nodes (menu_id, parent_id, sort_order);

create index if not exists menu_nodes_parent_id_idx
  on public.menu_nodes (parent_id);

create index if not exists menu_nodes_resource_idx
  on public.menu_nodes (resource_type, resource_id);

create index if not exists menu_nodes_status_idx on public.menu_nodes (status);

create index if not exists menu_nodes_deleted_at_idx on public.menu_nodes (deleted_at);

create index if not exists menu_nodes_created_by_idx on public.menu_nodes (created_by);

create index if not exists menu_nodes_updated_by_idx on public.menu_nodes (updated_by);

drop trigger if exists set_menu_nodes_updated_at on public.menu_nodes;

create trigger set_menu_nodes_updated_at
before update on public.menu_nodes
for each row
execute function public.set_updated_at();

alter table public.menu_nodes enable row level security;
