-- ═══════════════════════════════════════════════════════════════════
--  MIGRATION 019: Security hardening — role escalation + PII lockdown
--  Run via Supabase Dashboard → SQL Editor.
--  Run AFTER migrations 013, 014, 015, 016, 018.
--
--  LIVE VERIFIED (2026-09-08): a fresh self-signup account could
--   (1) read ALL students (ФИО, возраст, пол, класс, notes) and
--   (2) INSERT a profiles row with role='admin' → full admin rights.
--  This migration closes both holes, plus the storage-avatar
--  cross-tenant overwrite from migration 018.
--  Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- PART 1. ROLE ESCALATION GUARD (profiles.role)
--   profiles_insert_own / profiles_update_own (013) only check
--   auth.uid() = id, so anyone could set role='admin' on their own
--   row. The trigger below blocks it: only an existing admin
--   (is_admin()) may write role='admin' (INSERT or UPDATE).
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.prevent_admin_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Назначение роли admin запрещено: только действующий админ может выдавать роль admin';
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.prevent_admin_escalation() TO authenticated, anon;

DROP TRIGGER IF EXISTS trg_profiles_role ON public.profiles;
CREATE TRIGGER trg_profiles_role
BEFORE INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_escalation();

-- Username is the login (email = username@kanikuly.auth). Changing it
-- post-signup only serves to "rename oneself" onto an unclaimed child's
-- username and then claim them (own_claim_students matches by username).
-- Block non-admin username changes; admins may relink freely.
CREATE OR REPLACE FUNCTION public.prevent_username_takeover()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Смена login запрещена: username нельзя изменить после регистрации';
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.prevent_username_takeover() TO authenticated, anon;

DROP TRIGGER IF EXISTS trg_profiles_username ON public.profiles;
CREATE TRIGGER trg_profiles_username
BEFORE UPDATE OF username ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_username_takeover();

-- ═══════════════════════════════════════════════════════════════════
-- PART 2. PII LOCKDOWN — replace the wide-open
--   auth_select_* (auth.role()='authenticated' → ALL data for ANY
--   logged-in user) with own-only + admin policies.
--   Model mirrors migration 016 (player_progress): a player sees only
--   children linked to them (students.user_id = auth.uid()); admins
--   see everything. Static content tables (content_*, cards,
--   content_inventory_items) stay readable for authenticated — no PII.
-- ═══════════════════════════════════════════════════════════════════

-- ── STUDENTS ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_select_students"    ON public.students;

-- players can read their own linked child (from 014, kept)
--   "own_select_students": user_id = auth.uid()  [already exists]
-- players can also read an unclaimed child whose username equals
-- their own profile username — keeps the "auto-claim on first login"
-- flow (app.js selfLinkStudent) working without exposing everyone.
CREATE POLICY "own_select_claimable" ON public.students
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND username IS NOT NULL
    AND username = (SELECT p.username FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "admin_select_students" ON public.students
  FOR SELECT USING (public.is_admin());

-- ── OBSERVATIONS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_select_observations" ON public.observations;

CREATE POLICY "own_select_observations" ON public.observations
  FOR SELECT USING (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = observations.student_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_select_observations" ON public.observations
  FOR SELECT USING (public.is_admin());

-- ── BADGES ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_select_badges" ON public.badges;

CREATE POLICY "own_select_badges" ON public.badges
  FOR SELECT USING (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = badges.student_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_select_badges" ON public.badges
  FOR SELECT USING (public.is_admin());

-- ── COMPLETIONS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_select_completions" ON public.completions;

CREATE POLICY "own_select_completions" ON public.completions
  FOR SELECT USING (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = completions.student_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_select_completions" ON public.completions
  FOR SELECT USING (public.is_admin());

-- ── PARTICIPATIONS ──────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_select_participations" ON public.participations;

CREATE POLICY "own_select_participations" ON public.participations
  FOR SELECT USING (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = participations.student_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_select_participations" ON public.participations
  FOR SELECT USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════
-- PART 3. STORAGE AVATAR POLICIES — stop cross-tenant writes.
--   Migration 018 allowed ANY authenticated user to INSERT/UPDATE/
--   DELETE any file under images/avatars/. Now writes are allowed
--   only for a file whose name = own linked child's UUID
--   (avatars/{student_id}.{ext}), or for admins.
--   Public read on the bucket is intentionally kept (avatars are
--   displayed via public <img> URLs in the app).
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.can_manage_avatar(name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    (storage.foldername(name))[1] = 'avatars'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id::text = split_part(storage.filename(name), '.', 1)
          AND s.user_id = auth.uid()
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_avatar(text) TO authenticated;

DROP POLICY IF EXISTS "authenticated_avatar_upload" ON storage.objects;
CREATE POLICY "authenticated_avatar_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images' AND public.can_manage_avatar(name));

DROP POLICY IF EXISTS "authenticated_avatar_update" ON storage.objects;
CREATE POLICY "authenticated_avatar_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'images' AND public.can_manage_avatar(name))
  WITH CHECK (bucket_id = 'images' AND public.can_manage_avatar(name));

DROP POLICY IF EXISTS "authenticated_avatar_delete" ON storage.objects;
CREATE POLICY "authenticated_avatar_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'images' AND public.can_manage_avatar(name));

-- ═══════════════════════════════════════════════════════════════════
-- VERIFY
-- 1) No auth_select_* wide policies remain:
--    SELECT tablename, policyname, cmd, qual FROM pg_policies
--    WHERE schemaname='public' AND policyname LIKE 'auth_select_%';
-- 2) Role guard present:
--    SELECT tgname FROM pg_trigger WHERE tgname IN
--      ('trg_profiles_role','trg_profiles_username');
-- 3) Storage scoped:
--    SELECT policyname, cmd FROM pg_policies
--    WHERE schemaname='storage' AND tablename='objects'
--    ORDER BY policyname;
--
-- CLEANUP (after re-verification): delete the throwaway audit user
-- created during the audit (auditNNNNNN@kanikuly.auth) via
-- Dashboard → Authentication → Users → delete, or SQL:
--    DELETE FROM auth.users WHERE email LIKE 'audit%@kanikuly.auth';
-- ═══════════════════════════════════════════════════════════════════