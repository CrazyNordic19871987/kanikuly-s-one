-- Картинки в Supabase (загрузка через Table Editor / Storage, как в Glide)
-- Позволяет грузить изображения прямо из Supabase без git.
-- Колонка text хранит полный URL (или путь storage/v1/...):
--   https://xzmxxnhyvbzdebqhomzd.supabase.co/storage/v1/object/public/images/....

-- 1) Аватары участников
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2) Баннеры миссий
ALTER TABLE public.content_shifts ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 3) Иконки бейджей
ALTER TABLE public.content_badge_definitions ADD COLUMN IF NOT EXISTS image_url TEXT;
