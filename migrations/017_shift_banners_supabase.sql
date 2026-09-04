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
--  ── ШАГ 1 (ручной, в дашборде Supabase Storage) ──────────────
--  Загрузи в бакет «images» (тот же, куда грузятся аватары)
--  10 файлов из public/img/ с ТЕМИ ЖЕ именами:
--     mission1-banner.JPG ... mission10-banner.JPG
--  Полный путь каждого объекта:
--     images/mission{N}-banner.JPG
--
--  ── ШАГ 2 (после загрузки файлов) ────────────────────────────
--  Выполни UPDATE ниже. URL собирается по паттерну:
--     https://xzmxxnhyvbzdebqhomzd.supabase.co/storage/v1/object/public/images/...
--  Убедись, что имя бакета совпадает с тем, куда реально
--  загружены файлы (в проекте консистентно используется «images»).
--  При необходимости замени 'images' на актуальное имя бакета.

UPDATE public.content_shifts
SET banner_url = 'https://xzmxxnhyvbzdebqhomzd.supabase.co/storage/v1/object/public/images/mission'
               || shift_id::text
               || '-banner.JPG'
WHERE banner_url IS NULL
   OR banner_url = '';

-- Проверка: вывести строки, где banner_url теперь заполнен
SELECT shift_id, title, banner_url
FROM public.content_shifts
ORDER BY shift_id;
