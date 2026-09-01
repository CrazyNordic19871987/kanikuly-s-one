-- ═══════════════════════════════════════════════════════════════════
--  MIGRATION 012: Remove drone mission (piloting minidrones banned)
--  Run in Supabase Dashboard SQL Editor.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Delete mission row from content_missions
DELETE FROM content_missions WHERE id = 249;

-- 2. Remove the drone mission from content_shifts.directions (JSONB),
--    shift 7 «Smart City Lab», direction «Спорт».
UPDATE content_shifts
SET directions = (
  SELECT jsonb_agg(
    CASE
      WHEN dir->>'name' = 'Спорт' THEN
        dir || jsonb_build_object('missions', COALESCE(
          (SELECT jsonb_agg(m)
           FROM jsonb_array_elements(dir->'missions') m
           WHERE m->>'name' <> 'Пилотирование мини-дронов'),
          '[]'::jsonb
        ))
      ELSE dir
    END
  )
  FROM jsonb_array_elements(directions) dir
)
WHERE shift_id = 7;

-- 3. Remove drone mention from the free-text "sport" field of shift 7
UPDATE content_shifts
SET sport = regexp_replace(sport, '[Пп]илотирование мини-дронов,?\s*', '', 'g')
WHERE shift_id = 7;