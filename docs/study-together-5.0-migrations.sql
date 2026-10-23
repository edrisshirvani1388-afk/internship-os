-- ═══════════════════════════════════════════════════════════════
-- Study Together 5.0 — Avatar Storage + profile.avatar_url
-- Applied: 2026-10-23
-- Idempotent. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- 1. Profile column (separate from avatar_key which stays av-1..8)
alter table public.profiles
  add column if not exists avatar_url text
    check (avatar_url is null or (avatar_url ~ '^https://' and length(avatar_url) <= 1024));

-- 2. Storage bucket for user-uploaded avatars
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true,
  2097152,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. Storage RLS policies (path = <uid>/<filename>)
drop policy if exists "avatars_self_insert" on storage.objects;
create policy "avatars_self_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_self_update" on storage.objects;
create policy "avatars_self_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_self_delete" on storage.objects;
create policy "avatars_self_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_auth_read" on storage.objects;
create policy "avatars_auth_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars');

notify pgrst, 'reload schema';