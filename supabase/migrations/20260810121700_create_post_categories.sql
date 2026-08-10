create table if not exists public.post_categories (
  post_id uuid not null references public.posts (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (post_id, category_id),
  constraint post_categories_sort_order_non_negative check (sort_order >= 0)
);

create index if not exists post_categories_category_id_idx
  on public.post_categories (category_id);

create index if not exists post_categories_sort_order_idx
  on public.post_categories (post_id, sort_order);

alter table public.post_categories enable row level security;
