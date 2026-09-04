-- ============================================================
--  MIGRATION 017: Shift banner images → Supabase Storage
--  Run in Supabase Dashboard SQL Editor (after uploading files).
-- ============================================================
--
--  Цель: перенести баннеры миссий из статики репозитория
--  (public/img/mission{N}-banner.JPG) в Supabase Storage и
--  проставить content_shifts.banner_url, как это уже сделано
--  для аватаров (avatar_url на students).
--
--  Код приложения НЕ требует изменений: shiftBannerUrl() в
--  js/app.js уже читает banner_url (или image_url) и отдаёт
--  его при наличии, иначе фолбэк на статичный файл.
--  Статические файлы public/img/* оставлены как fallback.
--
--  ── Реальные данные проекта ─────────────────────────────────
--  Бакет:      images
--  Путь:       images/mission_banner/mission_1.JPG ... mission_10.JPG
--  Привязка:   номер файла = shift_id  (mission_3.JPG → shift_id 3)
--  Пример URL:
--    https://xzmxxnhyvbzdebqhomzd.supabase.co/storage/v1/object/public/images/mission_banner/mission_1.JPG
--
--  ── ШАГ 1 (ручной, в дашборде Supabase Storage) ──────────────
--  Убедись, что в бакете «images» в папке mission_banner лежат
--  файлы mission_1.JPG ... mission_10.JPG
--
--  ── ШАГ 2 (после загрузки файлов) ────────────────────────────
--  Выполни UPDATE ниже (идемпотентно: перезапишет banner_url
--  даже если часть значений уже заполнена).

UPDATE public.content_shifts
SET banner_url = 'https://xzmxxnhyvbzdebqhomzd.supabase.co/storage/v1/object/public/images/mission_banner/mission_'
               || shift_id::text
               || '.JPG'
WHERE shift_id BETWEEN 1 AND 10;

-- Проверка: вывести строки, где banner_url теперь заполнен
SELECT shift_id, title, banner_url
FROM public.content_shifts
ORDER BY shift_id;
