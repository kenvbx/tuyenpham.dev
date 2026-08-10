do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'cms-media'
  ) then
    insert into storage.buckets (
      id,
      name,
      public,
      file_size_limit,
      allowed_mime_types
    )
    values (
      'cms-media',
      'cms-media',
      true,
      26214400,
      array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/x-icon',
        'application/pdf'
      ]
    );
  else
    update storage.buckets
    set
      public = true,
      file_size_limit = 26214400,
      allowed_mime_types = array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/x-icon',
        'application/pdf'
      ],
      updated_at = now()
    where id = 'cms-media';
  end if;
end;
$$;

drop policy if exists cms_media_public_read on storage.objects;

create policy cms_media_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'cms-media');
