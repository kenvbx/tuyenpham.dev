create table if not exists public.post_related_posts (
  post_id uuid not null references public.posts (id) on delete cascade,
  related_post_id uuid not null references public.posts (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint post_related_posts_primary primary key (post_id, related_post_id),
  constraint post_related_posts_not_self check (post_id <> related_post_id),
  constraint post_related_posts_sort_order_non_negative check (sort_order >= 0)
);

create index if not exists post_related_posts_post_sort_idx
  on public.post_related_posts (post_id, sort_order);

create index if not exists post_related_posts_related_post_idx
  on public.post_related_posts (related_post_id);

alter table public.post_related_posts enable row level security;

drop policy if exists post_related_posts_select_public_published
on public.post_related_posts;

create policy post_related_posts_select_public_published
on public.post_related_posts
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.posts
    where posts.id = post_related_posts.post_id
      and posts.status = 'published'
      and posts.deleted_at is null
      and (posts.published_at is null or posts.published_at <= now())
  )
  and exists (
    select 1
    from public.posts related_posts
    where related_posts.id = post_related_posts.related_post_id
      and related_posts.status = 'published'
      and related_posts.deleted_at is null
      and (related_posts.published_at is null or related_posts.published_at <= now())
  )
);
