-- ============================================================
--  MIGRATION 018: Avatar upload → Supabase Storage
--  Run in Supabase Dashboard SQL Editor (REQUIRED for upload).
-- ============================================================
--
--  Цель: разрешить приложению загружать аватары участников
--  в бакет «images» (папка avatars/) из UI (кнопка 🖼️ в профиле
--  игрока — загрузка файлом вместо ручного ввода URL).
--
--  Код приложения (js/app.js):
--    uploadStudentAvatar() -> POST /storage/v1/object/images/avatars/{id}.{ext}
--    затем api.update(students, id, { avatar_url: <public URL> })
--
--  Для загрузки нужна политика записи в storage.objects для
--  авторизованного пользователя. Чтение выставляется публичным
--  (бакет images уже public на чтение через настройку bucket).

-- ── Убедиться, что бакет images существует ─────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- ── Политика записи для авторизованных пользователей ──────────
DROP POLICY IF EXISTS "authenticated_avatar_upload" ON storage.objects;

CREATE POLICY "authenticated_avatar_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'avatars'
  );

-- ── Обновление существующих записей (собственник) ─────────────
DROP POLICY IF EXISTS "authenticated_avatar_update" ON storage.objects;

CREATE POLICY "authenticated_avatar_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'images' AND (storage.foldername(name))[1] = 'avatars')
  WITH CHECK (bucket_id = 'images' AND (storage.foldername(name))[1] = 'avatars');

-- ── Публичное чтение (если бакет ещё не public) ───────────────
DROP POLICY IF EXISTS "public_avatar_read" ON storage.objects;

CREATE POLICY "public_avatar_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'images');

-- ── Проверка ───────────────────────────────────────────────────
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
