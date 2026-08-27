-- Добавить колонку nickname (обязательная для профиля, имя скрыто)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE public.students ALTER COLUMN nickname SET NOT NULL;
ALTER TABLE public.students ADD CONSTRAINT nickname_not_empty CHECK (length(btrim(nickname)) > 0);
