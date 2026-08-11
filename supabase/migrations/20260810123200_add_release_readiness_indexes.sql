create index if not exists pages_status_updated_at_idx
on public.pages (status, updated_at desc)
where deleted_at is null;

create index if not exists posts_status_published_at_idx
on public.posts (status, published_at desc)
where deleted_at is null;

create index if not exists media_files_status_created_at_idx
on public.media_files (status, created_at desc);

create index if not exists audit_logs_entity_created_at_idx
on public.audit_logs (entity_type, entity_id, created_at desc);
