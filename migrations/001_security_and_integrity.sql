-- ═══════════════════════════════════════════════════════════════════
--  MIGRATION 001: Security + Data Integrity
--  Run AFTER all setup_*.sql files have been executed.
--  ADDITIVE ONLY — no DROP TABLE, no data loss.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Ensure unique constraint on completions (prevents H5 duplication)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_completions_student_shift_dir_mis'
  ) THEN
    ALTER TABLE public.completions
      ADD CONSTRAINT uq_completions_student_shift_dir_mis
      UNIQUE (student_id, shift_id, direction_idx, mission_idx);
  END IF;
END $$;

-- 2. Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_students_shift    ON public.students(shift);
CREATE INDEX IF NOT EXISTS idx_students_campus   ON public.students(campus);
CREATE INDEX IF NOT EXISTS idx_students_squad    ON public.students(squad);
CREATE INDEX IF NOT EXISTS idx_obs_day           ON public.observations(day);
CREATE INDEX IF NOT EXISTS idx_obs_track         ON public.observations(track);
CREATE INDEX IF NOT EXISTS idx_completions_created ON public.completions(created_at);

-- 3. Content tables: ensure RLS is on (safe to re-run)
ALTER TABLE public.content_shifts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_competencies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_badge_definitions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_disc_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_missions           ENABLE ROW LEVEL SECURITY;

-- 4. Runtime tables: ensure RLS is on
ALTER TABLE public.students       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completions    ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════
-- Done. This migration is idempotent and safe to re-run.
-- ═══════════════════════════════════════════════════════════════════
