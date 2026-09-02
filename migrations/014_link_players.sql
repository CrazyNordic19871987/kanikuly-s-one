-- ═══════════════════════════════════════════════════════════════════
--  MIGRATION 014: Link players (auth users) to student records
--  Run via Supabase Dashboard → SQL Editor.
--  Run AFTER migration 013 has been applied.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Add linking columns to STUDENTS
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS username TEXT,          -- used to auto-match a player login
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_user_id   ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_username ON public.students(username);

-- 2. RLS: allow a player to SELECT their own linked student row
CREATE POLICY "own_select_students" ON public.students
  FOR SELECT USING (auth.role() = 'authenticated' AND user_id = auth.uid());

-- 3. RLS: allow a player to "claim" their student record (self-link).
--    A player may set user_id = their uid on a row that is currently
--    unlinked (user_id IS NULL) and whose `username` matches their profile
--    username. This prevents claiming someone else's record.
CREATE POLICY "own_claim_students" ON public.students
  FOR UPDATE
  USING (user_id IS NULL AND username = (SELECT p.username FROM public.profiles p WHERE p.id = auth.uid()))
  WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- HOW LINKING WORKS (auto-match by username on login)
--   1. Admin creates a student record and sets its `username` = player login
--   2. When that player logs in, the app matches profiles.username → students.username
--      and fills students.user_id = player auth uid (once, if empty)
--   3. Player's UI then only shows that one linked student row
-- ─────────────────────────────────────────────────────────────────────
-- ADMIN: to link manually after both exist, run e.g.
--   UPDATE students SET user_id = (SELECT id FROM auth.users WHERE email = 'player1@kanikuly.auth')
--     WHERE username = 'player1';
-- ═══════════════════════════════════════════════════════════════════
