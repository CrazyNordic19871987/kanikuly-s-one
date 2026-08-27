-- ═══════════════════════════════════════════════════════════════════
--  КАНИКУЛЫ С ONE! — RLS + RUNTIME TABLES
--  Запустите ПОСЛЕ setup_supabase.sql и setup_missions.sql
--
--  Создаёт 4 runtime-таблицы (students, observations, badges, completions)
--  Включает RLS на ВСЕ 9 таблиц и выдаёт политики:
--    • content_*   → публичное чтение + запись только из Dashboard
--    • runtime     → полный CRUD для anon-ключа (приложение + Dashboard)
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 1. RUNTIME ТАБЛИЦЫ
-- ═══════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.completions CASCADE;
DROP TABLE IF EXISTS public.badges CASCADE;
DROP TABLE IF EXISTS public.observations CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;

CREATE TABLE public.students (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  nickname    TEXT NOT NULL DEFAULT 'Player',
  age         INT,
  gender      TEXT,
  grade       INT,
  squad       INT,
  shift       INT,
  campus      TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Никнейм виден в приложении, имя/фамилия скрыты
ALTER TABLE public.students ADD CONSTRAINT nickname_not_empty CHECK (length(btrim(nickname)) > 0);

CREATE TABLE IF NOT EXISTS public.observations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  day          INT,
  track        TEXT,
  independence INT,
  quality      INT,
  initiative   BOOLEAN DEFAULT false,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  badge_id   TEXT,
  name       TEXT,
  icon       TEXT,
  track      TEXT,
  rarity     TEXT,
  earned     BOOLEAN DEFAULT true,
  earned_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.completions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  shift_id       INT,
  direction_idx  INT,
  direction_name TEXT,
  mission_idx    INT,
  mission_name   TEXT,
  score          INT,
  xp             INT,
  currency       INT,
  currency_name  TEXT,
  skills         JSONB,
  professions    JSONB,
  future_skills  JSONB,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- 2. ИНДЕКСЫ
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_observations_student ON public.observations(student_id);
CREATE INDEX IF NOT EXISTS idx_badges_student       ON public.badges(student_id);
CREATE INDEX IF NOT EXISTS idx_completions_student  ON public.completions(student_id);
CREATE INDEX IF NOT EXISTS idx_completions_shift     ON public.completions(shift_id);

-- ═══════════════════════════════════════════════════════════════════
-- 3. RLS — ВКЛЮЧЕНИЕ НА ВСЕХ 9 ТАБЛИЦАХ
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.students              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_shifts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_competencies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_disc_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_missions      ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════
-- 4. CONTENT ТАБЛИЦЫ — публичное чтение
--    (анонимный ключ может читать, запись — только через Dashboard)
-- ═══════════════════════════════════════════════════════════════════

-- Удаляем старые политики если есть (для повторного запуска)
DROP POLICY IF EXISTS "Public read content_shifts" ON public.content_shifts;
DROP POLICY IF EXISTS "Public read content_competencies" ON public.content_competencies;
DROP POLICY IF EXISTS "Public read content_badge_definitions" ON public.content_badge_definitions;
DROP POLICY IF EXISTS "Public read content_disc_config" ON public.content_disc_config;
DROP POLICY IF EXISTS "Public read content_missions" ON public.content_missions;

CREATE POLICY "Public read content_shifts"
  ON public.content_shifts FOR SELECT USING (true);

CREATE POLICY "Public read content_competencies"
  ON public.content_competencies FOR SELECT USING (true);

CREATE POLICY "Public read content_badge_definitions"
  ON public.content_badge_definitions FOR SELECT USING (true);

CREATE POLICY "Public read content_disc_config"
  ON public.content_disc_config FOR SELECT USING (true);

-- content_missions уже имеет SELECT из setup_missions.sql,
-- но на всякий случай пересоздаём (IF NOT EXISTS не работает для POLICY)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read content_missions' AND tablename = 'content_missions'
  ) THEN
    CREATE POLICY "Public read content_missions"
      ON public.content_missions FOR SELECT USING (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 5. RUNTIME ТАБЛИЦЫ — полный CRUD для anon
--    (приложение может читать и писать через anon-ключ)
-- ═══════════════════════════════════════════════════════════════════

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "anon_all_students" ON public.students;
DROP POLICY IF EXISTS "anon_all_observations" ON public.observations;
DROP POLICY IF EXISTS "anon_all_badges" ON public.badges;
DROP POLICY IF EXISTS "anon_all_completions" ON public.completions;

-- students
CREATE POLICY "anon_all_students"
  ON public.students FOR ALL
  USING (true) WITH CHECK (true);

-- observations
CREATE POLICY "anon_all_observations"
  ON public.observations FOR ALL
  USING (true) WITH CHECK (true);

-- badges
CREATE POLICY "anon_all_badges"
  ON public.badges FOR ALL
  USING (true) WITH CHECK (true);

-- completions
CREATE POLICY "anon_all_completions"
  ON public.completions FOR ALL
  USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════
-- Готово! Проверка:
--   SELECT COUNT(*) FROM public.students;          -- 0 (или сколько добавлено)
--   SELECT COUNT(*) FROM public.observations;      -- 0
--   SELECT COUNT(*) FROM public.badges;            -- 0
--   SELECT COUNT(*) FROM public.completions;       -- 0
--   SELECT COUNT(*) FROM public.content_shifts;    -- 10
--   SELECT COUNT(*) FROM public.content_missions;  -- 146
-- ═══════════════════════════════════════════════════════════════════
