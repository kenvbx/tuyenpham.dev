drop policy if exists profiles_select_own on public.profiles;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists roles_select_assigned on public.roles;

create policy roles_select_assigned
on public.roles
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.role_id = roles.id
      and user_roles.user_id = auth.uid()
  )
);

drop policy if exists permissions_select_assigned on public.permissions;

create policy permissions_select_assigned
on public.permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    join public.role_permissions
      on role_permissions.role_id = user_roles.role_id
    where user_roles.user_id = auth.uid()
      and role_permissions.permission_id = permissions.id
  )
);

drop policy if exists role_permissions_select_assigned on public.role_permissions;

create policy role_permissions_select_assigned
on public.role_permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.role_id = role_permissions.role_id
      and user_roles.user_id = auth.uid()
  )
);

drop policy if exists user_roles_select_own on public.user_roles;

create policy user_roles_select_own
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists settings_select_public on public.settings;

create policy settings_select_public
on public.settings
for select
to anon, authenticated
using (is_public = true);

drop policy if exists slugs_select_public_resolver on public.slugs;

create policy slugs_select_public_resolver
on public.slugs
for select
to anon, authenticated
using (
  redirect_to is not null
  or (
    is_active = true
    and (
      (
        reference_type = 'page'
        and exists (
          select 1
          from public.pages
          where pages.id = slugs.reference_id
            and pages.status = 'published'
            and pages.deleted_at is null
            and (pages.published_at is null or pages.published_at <= now())
        )
      )
      or (
        reference_type = 'blog-post'
        and exists (
          select 1
          from public.posts
          where posts.id = slugs.reference_id
            and posts.status = 'published'
            and posts.deleted_at is null
            and (posts.published_at is null or posts.published_at <= now())
        )
      )
      or (
        reference_type = 'category'
        and exists (
          select 1
          from public.categories
          where categories.id = slugs.reference_id
            and categories.status = 'published'
            and categories.deleted_at is null
        )
      )
      or (
        reference_type = 'tag'
        and exists (
          select 1
          from public.tags
          where tags.id = slugs.reference_id
            and tags.status = 'published'
            and tags.deleted_at is null
        )
      )
    )
  )
);

drop policy if exists seo_meta_select_public_entities on public.seo_meta;

create policy seo_meta_select_public_entities
on public.seo_meta
for select
to anon, authenticated
using (
  (
    entity_type = 'page'
    and exists (
      select 1
      from public.pages
      where pages.id = seo_meta.entity_id
        and pages.status = 'published'
        and pages.deleted_at is null
        and (pages.published_at is null or pages.published_at <= now())
    )
  )
  or (
    entity_type = 'blog-post'
    and exists (
      select 1
      from public.posts
      where posts.id = seo_meta.entity_id
        and posts.status = 'published'
        and posts.deleted_at is null
        and (posts.published_at is null or posts.published_at <= now())
    )
  )
  or (
    entity_type = 'category'
    and exists (
      select 1
      from public.categories
      where categories.id = seo_meta.entity_id
        and categories.status = 'published'
        and categories.deleted_at is null
    )
  )
  or (
    entity_type = 'tag'
    and exists (
      select 1
      from public.tags
      where tags.id = seo_meta.entity_id
        and tags.status = 'published'
        and tags.deleted_at is null
    )
  )
);

drop policy if exists media_files_select_public_active on public.media_files;

create policy media_files_select_public_active
on public.media_files
for select
to anon, authenticated
using (status = 'active' and deleted_at is null);

drop policy if exists pages_select_public_published on public.pages;

create policy pages_select_public_published
on public.pages
for select
to anon, authenticated
using (
  status = 'published'
  and deleted_at is null
  and (published_at is null or published_at <= now())
);

drop policy if exists posts_select_public_published on public.posts;

create policy posts_select_public_published
on public.posts
for select
to anon, authenticated
using (
  status = 'published'
  and deleted_at is null
  and (published_at is null or published_at <= now())
);

drop policy if exists categories_select_public_published on public.categories;

create policy categories_select_public_published
on public.categories
for select
to anon, authenticated
using (status = 'published' and deleted_at is null);

drop policy if exists tags_select_public_published on public.tags;

create policy tags_select_public_published
on public.tags
for select
to anon, authenticated
using (status = 'published' and deleted_at is null);

drop policy if exists post_categories_select_public_published on public.post_categories;

create policy post_categories_select_public_published
on public.post_categories
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.posts
    where posts.id = post_categories.post_id
      and posts.status = 'published'
      and posts.deleted_at is null
      and (posts.published_at is null or posts.published_at <= now())
  )
  and exists (
    select 1
    from public.categories
    where categories.id = post_categories.category_id
      and categories.status = 'published'
      and categories.deleted_at is null
  )
);

drop policy if exists post_tags_select_public_published on public.post_tags;

create policy post_tags_select_public_published
on public.post_tags
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.posts
    where posts.id = post_tags.post_id
      and posts.status = 'published'
      and posts.deleted_at is null
      and (posts.published_at is null or posts.published_at <= now())
  )
  and exists (
    select 1
    from public.tags
    where tags.id = post_tags.tag_id
      and tags.status = 'published'
      and tags.deleted_at is null
  )
);

drop policy if exists menus_select_public_active on public.menus;

create policy menus_select_public_active
on public.menus
for select
to anon, authenticated
using (status = 'active' and deleted_at is null);

drop policy if exists menu_nodes_select_public_active on public.menu_nodes;

create policy menu_nodes_select_public_active
on public.menu_nodes
for select
to anon, authenticated
using (
  status = 'active'
  and deleted_at is null
  and exists (
    select 1
    from public.menus
    where menus.id = menu_nodes.menu_id
      and menus.status = 'active'
      and menus.deleted_at is null
  )
);

drop policy if exists admin_notifications_select_own on public.admin_notifications;

create policy admin_notifications_select_own
on public.admin_notifications
for select
to authenticated
using (recipient_id = auth.uid() and deleted_at is null);
