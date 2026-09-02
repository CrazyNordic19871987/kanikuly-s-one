-- ═══════════════════════════════════════════════════════════════════
--  MIGRATION 015: Fix RLS infinite recursion in admin policies
--  Run via Supabase Dashboard → SQL Editor.
--  Run AFTER migrations 013 and 014.
--
--  PROBLEM: policies like
--     USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role='admin'))
--  query the `profiles` table from within a policy ON the same table,
--  causing "infinite recursion detected in policy for relation profiles".
--  ═══════════════════════════════════════════════════════════════════

-- 1. Security-definer helper — checks the admin role WITHOUT re-applying
--    RLS (runs with the owner's privileges), breaking the recursion.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- ── PROFILES ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;

CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT USING (public.is_admin());
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE USING (public.is_admin());
CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE USING (public.is_admin());

-- ── STUDENTS ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS admin_insert_students ON public.students;
DROP POLICY IF EXISTS admin_update_students ON public.students;
DROP POLICY IF EXISTS admin_delete_students ON public.students;

CREATE POLICY admin_insert_students ON public.students
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY admin_update_students ON public.students
  FOR UPDATE USING (public.is_admin());
CREATE POLICY admin_delete_students ON public.students
  FOR DELETE USING (public.is_admin());

-- ── OBSERVATIONS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS admin_insert_observations ON public.observations;
DROP POLICY IF EXISTS admin_update_observations ON public.observations;
DROP POLICY IF EXISTS admin_delete_observations ON public.observations;

CREATE POLICY admin_insert_observations ON public.observations
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY admin_update_observations ON public.observations
  FOR UPDATE USING (public.is_admin());
CREATE POLICY admin_delete_observations ON public.observations
  FOR DELETE USING (public.is_admin());

-- ── BADGES ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS admin_insert_badges ON public.badges;
DROP POLICY IF EXISTS admin_delete_badges ON public.badges;

CREATE POLICY admin_insert_badges ON public.badges
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY admin_delete_badges ON public.badges
  FOR DELETE USING (public.is_admin());

-- ── COMPLETIONS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS admin_insert_completions ON public.completions;
DROP POLICY IF EXISTS admin_delete_completions ON public.completions;

CREATE POLICY admin_insert_completions ON public.completions
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY admin_delete_completions ON public.completions
  FOR DELETE USING (public.is_admin());

-- ── PARTICIPATIONS ───────────────────────────────────────────────
DROP POLICY IF EXISTS admin_all_participations ON public.participations;

CREATE POLICY admin_all_participations ON public.participations
  FOR ALL USING (public.is_admin());

-- ── CARDS ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS admin_all_cards ON public.cards;

CREATE POLICY admin_all_cards ON public.cards
  FOR ALL USING (public.is_admin());

-- ── CONTENT INVENTORY ITEMS ──────────────────────────────────────
DROP POLICY IF EXISTS admin_all_inventory ON public.content_inventory_items;

CREATE POLICY admin_all_inventory ON public.content_inventory_items
  FOR ALL USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════
-- VERIFY: SELECT policyname, cmd FROM pg_policies WHERE tablename='profiles';
-- The admin policies should now show qual = (public.is_admin())
-- ═══════════════════════════════════════════════════════════════════
