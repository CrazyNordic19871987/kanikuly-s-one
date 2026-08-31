-- ═══════════════════════════════════════════════════════════════════
--  MIGRATION 009: Integrity fixes
--  Adds the missing UNIQUE constraints and FOREIGN KEYS identified in
--  SCHEMA_REVIEW.md. Idempotent and ADDITIVE ONLY — no DROP TABLE, no
--  data loss. Each step is guarded: if existing data would violate the
--  new constraint, the step is skipped with a NOTICE instead of failing.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. content_missions: UNIQUE (shift_id, mission_name) ───────────
-- Prevents duplicated missions within the same shift (breaks code mapping).
DO $$
DECLARE
  dup_count INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'uq_content_missions_shift_name') THEN
    SELECT count(*) INTO dup_count FROM (
      SELECT shift_id, mission_name
      FROM public.content_missions
      GROUP BY shift_id, mission_name
      HAVING count(*) > 1
    ) d;
    IF dup_count = 0 THEN
      ALTER TABLE public.content_missions
        ADD CONSTRAINT uq_content_missions_shift_name
        UNIQUE (shift_id, mission_name);
      RAISE NOTICE '009: added uq_content_missions_shift_name';
    ELSE
      RAISE NOTICE '009: SKIPPED uniq (shift_id,mission_name) — % duplicate row-group(s) exist on content_missions', dup_count;
    END IF;
  END IF;
END $$;

-- ── 2. content_missions.shift_id → content_shifts (FK) ─────────────
DO $$
DECLARE
  orphan_count INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'fk_content_missions_shift') THEN
    SELECT count(*) INTO orphan_count FROM public.content_missions m
      WHERE NOT EXISTS (SELECT 1 FROM public.content_shifts s
                        WHERE s.shift_id = m.shift_id);
    IF orphan_count = 0 THEN
      ALTER TABLE public.content_missions
        ADD CONSTRAINT fk_content_missions_shift
        FOREIGN KEY (shift_id) REFERENCES public.content_shifts(shift_id);
      RAISE NOTICE '009: added fk_content_missions_shift';
    ELSE
      RAISE NOTICE '009: SKIPPED fk_content_missions_shift — % orphan shift_id(s) on content_missions', orphan_count;
    END IF;
  END IF;
END $$;

-- ── 3. content_inventory_items.shift_id → content_shifts (FK) ──────
DO $$
DECLARE
  orphan_count INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'fk_inventory_shift') THEN
    SELECT count(*) INTO orphan_count FROM public.content_inventory_items i
      WHERE NOT EXISTS (SELECT 1 FROM public.content_shifts s
                        WHERE s.shift_id = i.shift_id);
    IF orphan_count = 0 THEN
      ALTER TABLE public.content_inventory_items
        ADD CONSTRAINT fk_inventory_shift
        FOREIGN KEY (shift_id) REFERENCES public.content_shifts(shift_id);
      RAISE NOTICE '009: added fk_inventory_shift';
    ELSE
      RAISE NOTICE '009: SKIPPED fk_inventory_shift — % orphan shift_id(s) on content_inventory_items', orphan_count;
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- NOTE: UNIQUE (student_id, shift_id) on participations and UNIQUE
-- (student_id, shift_id, direction_idx, mission_idx) on completions
-- ALREADY EXIST (migrations 007 and 001 respectively). They are NOT
-- re-added here to avoid duplicate constraints.
-- ═══════════════════════════════════════════════════════════════════
