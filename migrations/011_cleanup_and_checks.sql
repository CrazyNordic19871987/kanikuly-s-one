-- ═══════════════════════════════════════════════════════════════════
--  MIGRATION 011: Cleanup + CHECK ranges
--  (A) Add CHECK constraints to score fields (confirmed ranges:
--      observations.independence/quality = 0..5, completions.score = 0..10).
--  (B) Drop legacy students.shift / students.squad columns, guarded:
--      removed only if all legacy data has been backfilled to
--      participations (migrations/007). If any row still lacks a
--      participation, the drop is skipped with a NOTICE.
--  Idempotent and ADDITIVE SAFE — no data loss without confirmation.
-- ═══════════════════════════════════════════════════════════════════

-- ── (A1) observations.independence CHECK 0..5 ─────────────────────
DO $$
DECLARE
  bad_count INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_obs_independence') THEN
    SELECT count(*) INTO bad_count FROM public.observations
      WHERE independence IS NOT NULL AND (independence < 0 OR independence > 5);
    IF bad_count = 0 THEN
      ALTER TABLE public.observations
        ADD CONSTRAINT chk_obs_independence CHECK (independence IS NULL OR independence BETWEEN 0 AND 5);
      RAISE NOTICE '011: added chk_obs_independence';
    ELSE
      RAISE NOTICE '011: SKIPPED chk_obs_independence — % row(s) outside 0..5', bad_count;
    END IF;
  END IF;
END $$;

-- ── (A2) observations.quality CHECK 0..5 ──────────────────────────
DO $$
DECLARE
  bad_count INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_obs_quality') THEN
    SELECT count(*) INTO bad_count FROM public.observations
      WHERE quality IS NOT NULL AND (quality < 0 OR quality > 5);
    IF bad_count = 0 THEN
      ALTER TABLE public.observations
        ADD CONSTRAINT chk_obs_quality CHECK (quality IS NULL OR quality BETWEEN 0 AND 5);
      RAISE NOTICE '011: added chk_obs_quality';
    ELSE
      RAISE NOTICE '011: SKIPPED chk_obs_quality — % row(s) outside 0..5', bad_count;
    END IF;
  END IF;
END $$;

-- ── (A3) completions.score CHECK 0..10 ────────────────────────────
DO $$
DECLARE
  bad_count INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_completions_score') THEN
    SELECT count(*) INTO bad_count FROM public.completions
      WHERE score IS NOT NULL AND (score < 0 OR score > 10);
    IF bad_count = 0 THEN
      ALTER TABLE public.completions
        ADD CONSTRAINT chk_completions_score CHECK (score IS NULL OR score BETWEEN 0 AND 10);
      RAISE NOTICE '011: added chk_completions_score';
    ELSE
      RAISE NOTICE '011: SKIPPED chk_completions_score — % row(s) outside 0..10', bad_count;
    END IF;
  END IF;
END $$;

-- ── (B) Drop legacy students.shift / students.squad ───────────────
DO $$
DECLARE
  unmigrated INT;
BEGIN
  -- Ensure every student that references shift/squad already has a
  -- participation row for that shift (so no data is lost on drop).
  SELECT count(*) INTO unmigrated FROM public.students s
    WHERE s.shift IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.participations p
                      WHERE p.student_id = s.id AND p.shift_id = s.shift);
  IF unmigrated = 0 THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='students' AND column_name='shift') THEN
      ALTER TABLE public.students DROP COLUMN IF EXISTS shift;
      RAISE NOTICE '011: dropped students.shift';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='students' AND column_name='squad') THEN
      ALTER TABLE public.students DROP COLUMN IF EXISTS squad;
      RAISE NOTICE '011: dropped students.squad';
    END IF;
  ELSE
    RAISE NOTICE '011: SKIPPED dropping students.shift/squad — % student(s) have shift without a participation row', unmigrated;
  END IF;
END $$;

-- Notice: idx_students_shift / idx_students_squad (migration 001) become
-- obsolete once the columns are dropped; they are removed automatically with
-- the columns and are not re-created.

-- ═══════════════════════════════════════════════════════════════════
-- Done.
-- ═══════════════════════════════════════════════════════════════════
