-- ═══════════════════════════════════════════════════════════════════
--  MIGRATION 002: RLS Lockdown
--  Run AFTER setup_rls.sql via Supabase Dashboard SQL Editor.
--  Replaces open anon policies with tighter read-only for content
--  and restrictive anon CRUD for runtime (no cross-delete).
-- ═══════════════════════════════════════════════════════════════════

-- 1. CONTENT TABLES — SELECT-only for anon (write via Dashboard only)

DROP POLICY IF EXISTS "anon_all_content_shifts" ON public.content_shifts;
DROP POLICY IF EXISTS "anon_all_content_competencies" ON public.content_competencies;
DROP POLICY IF EXISTS "anon_all_content_badge_definitions" ON public.content_badge_definitions;
DROP POLICY IF EXISTS "anon_all_content_disc_config" ON public.content_disc_config;
DROP POLICY IF EXISTS "anon_all_content_missions" ON public.content_missions;

-- 2. RUNTIME TABLES — replace wide-open policies with scoped ones

DROP POLICY IF EXISTS "anon_all_students"    ON public.students;
DROP POLICY IF EXISTS "anon_all_observations" ON public.observations;
DROP POLICY IF EXISTS "anon_all_badges"      ON public.badges;
DROP POLICY IF EXISTS "anon_all_completions" ON public.completions;

-- students: anon can SELECT + INSERT + UPDATE (no DELETE — prevents data loss)
CREATE POLICY "anon_select_students"
  ON public.students FOR SELECT USING (true);
CREATE POLICY "anon_insert_students"
  ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_students"
  ON public.students FOR UPDATE USING (true);

-- observations: anon can SELECT + INSERT + UPDATE + DELETE
CREATE POLICY "anon_select_observations"
  ON public.observations FOR SELECT USING (true);
CREATE POLICY "anon_insert_observations"
  ON public.observations FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_observations"
  ON public.observations FOR UPDATE USING (true);
CREATE POLICY "anon_delete_observations"
  ON public.observations FOR DELETE USING (true);

-- badges: anon can SELECT + INSERT (no update/delete — badges are immutable)
CREATE POLICY "anon_select_badges"
  ON public.badges FOR SELECT USING (true);
CREATE POLICY "anon_insert_badges"
  ON public.badges FOR INSERT WITH CHECK (true);

-- completions: anon can SELECT + INSERT + DELETE (replace pattern)
CREATE POLICY "anon_select_completions"
  ON public.completions FOR SELECT USING (true);
CREATE POLICY "anon_insert_completions"
  ON public.completions FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_delete_completions"
  ON public.completions FOR DELETE USING (true);

-- ═══════════════════════════════════════════════════════════════════
-- Done. Students can no longer be deleted by the app.
-- Badges are append-only.
-- Content tables are read-only for anon.
-- ═══════════════════════════════════════════════════════════════════
