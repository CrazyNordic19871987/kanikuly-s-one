-- Добавить колонку nickname (обязательная для профиля, имя скрыто в приложении)
-- Безопасно для существующих участников: заполняет nickname из first_name,
-- если колонка ещё не заполнена, чтобы SET NOT NULL не упал на NULL-значениях.

-- 1) Добавляем колонку (если ещё нет)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS nickname TEXT;

-- 2) Заполняем пустые никнеймы из first_name (для уже существующих участников)
--    Оставляем текущие никнеймы, если они уже заданы.
UPDATE public.students
   SET nickname = COALESCE(first_name, 'Player')
 WHERE nickname IS NULL OR btrim(nickname) = '';

-- 3) Делаем колонку NOT NULL
ALTER TABLE public.students ALTER COLUMN nickname SET NOT NULL;

-- 4) Ограничение: никнейм не должен быть пустой строкой
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS nickname_not_empty;
ALTER TABLE public.students ADD CONSTRAINT nickname_not_empty CHECK (length(btrim(nickname)) > 0);
