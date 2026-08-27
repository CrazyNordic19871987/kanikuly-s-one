-- Картинки 4 DISC-профилей (D, I, S, C)
-- Вставь URL из Supabase Storage (public bucket) в JSON ниже.
-- Пример: https://xzmxxnhyvbzdebqhomzd.supabase.co/storage/v1/object/public/images/disc-D.png
-- Если картинки нет — приложение покажет эмодзи-заглушку.

-- Если ряд images ещё не существует — добавить:
INSERT INTO public.content_disc_config (config_key, config_value)
VALUES ('images', '{"D":"","I":"","S":"","C":""}'::jsonb)
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

-- Затем просто обнови JSON в Table Editor: content_disc_config → ряд images → config_value
--   {"D":"<url>","I":"<url>","S":"<url>","C":"<url>"}
