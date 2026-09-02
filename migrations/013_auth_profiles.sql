-- ═══════════════════════════════════════════════════════════════════
--  MIGRATION 013: Auth Profiles + Role-Based Access
--  Run via Supabase Dashboard → SQL Editor.
--  Requires: Supabase Auth enabled, email confirmations disabled.
-- ═══════════════════════════════════════════════════════════════════

-- 1. PROFILES TABLE — extends Supabase Auth with role info
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'player')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- profiles: users can read/update their own; admins can do everything
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. DROP old wide-open anon policies on runtime tables
DROP POLICY IF EXISTS "anon_select_students"      ON public.students;
DROP POLICY IF EXISTS "anon_insert_students"      ON public.students;
DROP POLICY IF EXISTS "anon_update_students"      ON public.students;
DROP POLICY IF EXISTS "anon_select_observations"  ON public.observations;
DROP POLICY IF EXISTS "anon_insert_observations"  ON public.observations;
DROP POLICY IF EXISTS "anon_update_observations"  ON public.observations;
DROP POLICY IF EXISTS "anon_delete_observations"  ON public.observations;
DROP POLICY IF EXISTS "anon_select_badges"        ON public.badges;
DROP POLICY IF EXISTS "anon_insert_badges"        ON public.badges;
DROP POLICY IF EXISTS "anon_select_completions"   ON public.completions;
DROP POLICY IF EXISTS "anon_insert_completions"   ON public.completions;
DROP POLICY IF EXISTS "anon_delete_completions"   ON public.completions;
DROP POLICY IF EXISTS "anon_all_participations"   ON public.participations;
DROP POLICY IF EXISTS "anon_all_cards"            ON public.cards;
DROP POLICY IF EXISTS "anon_all_content_inventory_items" ON public.content_inventory_items;

-- Also drop any legacy wide-open policies
DROP POLICY IF EXISTS "anon_all_students"         ON public.students;
DROP POLICY IF EXISTS "anon_all_observations"     ON public.observations;
DROP POLICY IF EXISTS "anon_all_badges"           ON public.badges;
DROP POLICY IF EXISTS "anon_all_completions"      ON public.completions;

-- 3. NEW POLICIES: authenticated users can read, admins can write

-- STUDENTS
CREATE POLICY "auth_select_students" ON public.students
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_insert_students" ON public.students
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_update_students" ON public.students
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_delete_students" ON public.students
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- OBSERVATIONS
CREATE POLICY "auth_select_observations" ON public.observations
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_insert_observations" ON public.observations
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_update_observations" ON public.observations
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_delete_observations" ON public.observations
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- BADGES
CREATE POLICY "auth_select_badges" ON public.badges
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_insert_badges" ON public.badges
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_delete_badges" ON public.badges
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- COMPLETIONS
CREATE POLICY "auth_select_completions" ON public.completions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_insert_completions" ON public.completions
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_delete_completions" ON public.completions
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- PARTICIPATIONS
CREATE POLICY "auth_select_participations" ON public.participations
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_participations" ON public.participations
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- CARDS
CREATE POLICY "auth_select_cards" ON public.cards
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_cards" ON public.cards
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- CONTENT INVENTORY ITEMS
CREATE POLICY "auth_select_inventory" ON public.content_inventory_items
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_inventory" ON public.content_inventory_items
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. CONTENT TABLES — keep read-only for authenticated (drop anon read if exists)
DROP POLICY IF EXISTS "anon_read_content_shifts" ON public.content_shifts;
DROP POLICY IF EXISTS "anon_read_content_competencies" ON public.content_competencies;
DROP POLICY IF EXISTS "anon_read_content_badge_definitions" ON public.content_badge_definitions;
DROP POLICY IF EXISTS "anon_read_content_disc_config" ON public.content_disc_config;
DROP POLICY IF EXISTS "anon_read_content_missions" ON public.content_missions;

CREATE POLICY "auth_select_content_shifts" ON public.content_shifts
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select_content_competencies" ON public.content_competencies
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select_content_badge_definitions" ON public.content_badge_definitions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select_content_disc_config" ON public.content_disc_config
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select_content_missions" ON public.content_missions
  FOR SELECT USING (auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════════════
-- ADMIN USER SETUP
-- After running this migration:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Create user: email = admin@kanikuly.auth, password = <your password>
-- 3. Then run: UPDATE profiles SET role = 'admin' WHERE username = 'admin';
-- ═══════════════════════════════════════════════════════════════════
