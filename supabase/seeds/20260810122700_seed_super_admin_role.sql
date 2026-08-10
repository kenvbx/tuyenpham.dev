insert into public.roles (slug, name, description, is_system, is_default)
values (
  'super-admin',
  'Super Admin',
  'Full CMS access with all system permissions.',
  true,
  false
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system,
  is_default = excluded.is_default,
  updated_at = now();

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
cross join public.permissions
where roles.slug = 'super-admin'
on conflict (role_id, permission_id) do nothing;
