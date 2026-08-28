-- ═══════════════════════════════════════════════════════════════════
--  Каникулы с ONE! — УЧАСТИЕ В МИССИЯХ (participations)
--  Одна строка = «участник У в миссии X команда N (1-10)».
--  Один участник может участвовать в нескольких миссиях, в каждой —
--  в своей команде (1..10). Участники могут добавляться в любую миссию
--  позже (не все участвуют во всех миссиях).
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.participations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID REFERENCES public.students(id) ON DELETE CASCADE,
  shift_id    INT  NOT NULL,            -- номер миссии 1..10
  squad       INT  NOT NULL CHECK (squad BETWEEN 1 AND 10),  -- команда 1..10
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, shift_id)
);

ALTER TABLE public.participations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_participations" ON public.participations;
CREATE POLICY "anon_all_participations"
  ON public.participations FOR ALL USING (true);

DROP POLICY IF EXISTS "anon_read_participations" ON public.participations;
CREATE POLICY "anon_read_participations"
  ON public.participations FOR SELECT USING (true);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_participations_student ON public.participations (student_id);
CREATE INDEX IF NOT EXISTS idx_participations_shift   ON public.participations (shift_id);

-- ═══════════════════════════════════════════════════════════════════
-- Перенос: студенты, у которых уже есть shift + squad, получают участие
-- в своей миссии и команде (если его ещё нет).
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO public.participations (student_id, shift_id, squad)
SELECT id, shift, squad
FROM public.students s
WHERE s.shift IS NOT NULL AND s.squad IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.participations p
                  WHERE p.student_id = s.id AND p.shift_id = s.shift)
ON CONFLICT (student_id, shift_id) DO NOTHING;
