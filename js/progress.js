// ════════════════════════════════════════════
//  КАНИКУЛЫ С ONE! — PROGRESS PERSISTENCE
//  Persists gamification state (coins, streaks,
//  relics, bosses, mystery, avatars, limited
//  badges) to the Supabase player_progress table.
// ════════════════════════════════════════════

// The mutable per-student progression shape.
// Keys mirror the in-memory `state` maps.
const PROGRESS_TABLE = 'player_progress';

// Normalize a stored JSONB row into a flat progress object.
function normalizeProgressRow(row) {
  const data = (row && row.data) || {};
  return {
    coins: data.coins || {},
    streaks: data.streaks || {},
    relics: data.relics || {},
    bossDefeated: data.bossDefeated || {},
    mysteryCount: data.mysteryCount || {},
    avatars: data.avatars || {},
    limitedEarned: data.limitedEarned || {}
  };
}

// Build a JSONB payload from a normalized progress object.
function toProgressPayload(progress) {
  return {
    data: {
      coins: progress.coins || {},
      streaks: progress.streaks || {},
      relics: progress.relics || {},
      bossDefeated: progress.bossDefeated || {},
      mysteryCount: progress.mysteryCount || {},
      avatars: progress.avatars || {},
      limitedEarned: progress.limitedEarned || {}
    },
    updated_at: new Date().toISOString()
  };
}

// Fetch all progress rows. Returns a map keyed by student_id -> normalized
// progress object. Used by the global boot loader; RLS keeps it to rows the
// caller may read (own students for a player, all for admin).
async function loadAllProgress() {
  try {
    const rows = await api.getAll(PROGRESS_TABLE);
    const map = {};
    (Array.isArray(rows) ? rows : []).forEach(r => {
      if (r && r.student_id) map[String(r.student_id)] = normalizeProgressRow(r);
    });
    return map;
  } catch (e) {
    console.warn('loadAllProgress failed:', e);
    return {};
  }
}

// Upsert a full progress object for a student by `student_id`.
async function saveStudentProgress(studentId, progress) {
  if (!studentId) return false;
  const payload = toProgressPayload(progress);
  // INSERT with on_conflict=student_id (targets the UNIQUE column).
  try {
    const res = await fetch(api.base + '/' + PROGRESS_TABLE, {
      method: 'POST',
      headers: {
        'apikey': api.h.apikey,
        'Authorization': api.h.Authorization,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
        'on_conflict': 'student_id'
      },
      body: JSON.stringify({ student_id: String(studentId), ...payload })
    });
    if (!res.ok) {
      const t = await res.text();
      console.warn('saveStudentProgress insert failed:', studentId, res.status, t.substring(0, 120));
      return false;
    }
    return true;
  } catch (e) {
    console.warn('saveStudentProgress error:', studentId, e);
    return false;
  }
}

// Debounced persistence helper: queues a save per student and flushes
// after `delay` ms. Prevents write-spam during rapid mutation.
const _saveTimers = {};
function debouncedSaveProgress(studentId, progress, delay) {
  if (!studentId) return;
  if (_saveTimers[studentId]) clearTimeout(_saveTimers[studentId]);
  _saveTimers[studentId] = setTimeout(() => {
    delete _saveTimers[studentId];
    saveStudentProgress(studentId, progress);
  }, delay || 600);
}

// Merge persisted progress into the live `state` maps.
function applyProgressToState(state, progressByStudent) {
  if (!state || !progressByStudent) return;
  state.coins = {};
  state.streaks = {};
  state.relics = {};
  state.bossDefeated = {};
  state.mysteryCount = {};
  state.avatars = {};
  state.limitedEarned = {};
  Object.keys(progressByStudent).forEach(sid => {
    const p = progressByStudent[sid];
    if (p.coins && Object.keys(p.coins).length) state.coins[sid] = p.coins[sid] !== undefined ? p.coins[sid] : 0;
    if (p.streaks && p.streaks[sid]) state.streaks[sid] = p.streaks[sid];
    if (p.relics && p.relics[sid]) state.relics[sid] = p.relics[sid];
    if (p.bossDefeated && p.bossDefeated[sid]) state.bossDefeated[sid] = p.bossDefeated[sid];
    if (p.mysteryCount && p.mysteryCount[sid] !== undefined) state.mysteryCount[sid] = p.mysteryCount[sid];
    if (p.avatars && p.avatars[sid]) state.avatars[sid] = p.avatars[sid];
    if (p.limitedEarned && p.limitedEarned[sid]) state.limitedEarned[sid] = p.limitedEarned[sid];
  });
}

// Extract a normalized progress object snapshot back from live state
// (for a given student) so it can be persisted.
function snapshotStudentProgress(state, studentId) {
  const sid = String(studentId);
  return {
    coins: state.coins || {},
    streaks: state.streaks || {},
    relics: state.relics || {},
    bossDefeated: state.bossDefeated || {},
    mysteryCount: state.mysteryCount || {},
    avatars: state.avatars || {},
    limitedEarned: state.limitedEarned || {}
  };
}

window.loadAllProgress = loadAllProgress;
window.saveStudentProgress = saveStudentProgress;
window.debouncedSaveProgress = debouncedSaveProgress;
window.applyProgressToState = applyProgressToState;
window.snapshotStudentProgress = snapshotStudentProgress;
