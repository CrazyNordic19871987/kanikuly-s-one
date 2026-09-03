-- ═══════════════════════════════════════════════════════════════════
--  MIGRATION 016: Player progress persistence
--  Persists gamification state (coins, streaks, relics, bosses,
--  mystery boxes, avatars, limited badges, inventory) to Supabase.
--  One row per student; all mutable progression stored as JSONB.
--  Run via Supabase Dashboard → SQL Editor.
--  Run AFTER migrations 013, 014, 015.
-- ═══════════════════════════════════════════════════════════════════

-- 1. TABLE: player_progress (one row per student)
CREATE TABLE IF NOT EXISTS public.player_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_progress_student ON public.player_progress(student_id);

ALTER TABLE public.player_progress ENABLE ROW LEVEL SECURITY;

-- 2. RLS POLICIES
-- Player can read their own linked student's progress.
CREATE POLICY "own_select_progress" ON public.player_progress
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = player_progress.student_id AND s.user_id = auth.uid()
      )
    )
  );

-- Player can upsert their own linked student's progress row.
CREATE POLICY "own_upsert_progress" ON public.player_progress
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = player_progress.student_id AND s.user_id = auth.uid()
      )
    )
  );
CREATE POLICY "own_update_progress" ON public.player_progress
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = player_progress.student_id AND s.user_id = auth.uid()
      )
    )
  );

-- Admins can read/write all progress rows.
CREATE POLICY "admin_all_progress" ON public.player_progress
  FOR ALL USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════
-- NOTE: SELECT is intentionally NOT open to all authenticated users.
-- Only the student's own linked row (via students.user_id) and admins.
-- ═══════════════════════════════════════════════════════════════════
