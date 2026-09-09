import { describe, it, expect } from 'vitest';
import {
  normalizeProgressRow,
  toProgressPayload,
  applyProgressToState,
  snapshotStudentProgress
} from '../js/progress.js';

const SECTIONS = ['coins', 'streaks', 'relics', 'bossDefeated', 'mysteryCount', 'avatars', 'limitedEarned'];

describe('normalizeProgressRow()', () => {
  it('returns empty maps for a null row', () => {
    const p = normalizeProgressRow(null);
    SECTIONS.forEach(k => expect(p[k]).toEqual({}));
  });

  it('handles a row without a data payload', () => {
    const p = normalizeProgressRow({ student_id: 7 });
    expect(p.coins).toEqual({});
  });

  it('copies known maps from data and ignores extras', () => {
    const p = normalizeProgressRow({ data: { coins: { 1: 12 }, relics: { 1: ['relic_x'] }, junk: true } });
    expect(p.coins).toEqual({ 1: 12 });
    expect(p.relics).toEqual({ 1: ['relic_x'] });
    expect(p).not.toHaveProperty('junk');
  });

  it('defaults missing maps to empty objects', () => {
    const p = normalizeProgressRow({ data: { coins: { 1: 5 } } });
    expect(p.streaks).toEqual({});
    expect(p.avatars).toEqual({});
    expect(p.limitedEarned).toEqual({});
  });
});

describe('toProgressPayload()', () => {
  it('wraps all progress maps under the data key', () => {
    const p = toProgressPayload({ coins: { 1: 10 } });
    expect(p.data.coins).toEqual({ 1: 10 });
    expect(p.data.streaks).toEqual({});
    expect(p.data.limitedEarned).toEqual({});
  });

  it('falls back to empty maps when fields are missing', () => {
    const p = toProgressPayload({});
    SECTIONS.forEach(k => expect(p.data[k]).toEqual({}));
  });

  it('sets an ISO updated_at timestamp', () => {
    expect(toProgressPayload({}).updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('applyProgressToState()', () => {
  function baseState() {
    return { coins: { old: 1 }, streaks: {}, relics: {}, bossDefeated: {}, mysteryCount: {}, avatars: {}, limitedEarned: {} };
  }

  it('resets all maps before applying', () => {
    const st = baseState();
    applyProgressToState(st, {});
    expect(st.coins).toEqual({});
    expect(st.streaks).toEqual({});
    expect(st.relics).toEqual({});
  });

  it('applies per-student progress', () => {
    const st = baseState();
    applyProgressToState(st, {
      1: { coins: { 1: 30 }, streaks: { 1: { count: 2, lastDate: '2026-06-01' } } }
    });
    expect(st.coins[1]).toBe(30);
    expect(st.streaks[1]).toEqual({ count: 2, lastDate: '2026-06-01' });
  });

  it('writes a default 0 coin count when the section exists but the student does not', () => {
    const st = baseState();
    applyProgressToState(st, { 1: { coins: { 2: 5 } } });
    expect(st.coins[1]).toBe(0);
  });

  it('skips sections that are absent for a student', () => {
    const st = baseState();
    applyProgressToState(st, { 1: { coins: { 1: 5 } } });
    expect(st.relics[1]).toBeUndefined();
    expect(st.bossDefeated[1]).toBeUndefined();
  });

  it('is tolerant of null args', () => {
    expect(() => applyProgressToState(null, {})).not.toThrow();
    expect(() => applyProgressToState({}, null)).not.toThrow();
  });
});

describe('snapshotStudentProgress()', () => {
  it('keeps only the given student slices', () => {
    const snap = snapshotStudentProgress(
      { coins: { 1: 5, 2: 9 }, streaks: { 1: { count: 3, lastDate: 'x' } } },
      1
    );
    expect(snap.coins).toEqual({ 1: 5 });
    expect(snap.streaks).toEqual({ 1: { count: 3, lastDate: 'x' } });
  });

  it('excludes other students entirely', () => {
    expect(snapshotStudentProgress({ coins: { 2: 9 } }, 1).coins).toEqual({});
  });

  it('string-coerces numeric student ids', () => {
    expect(snapshotStudentProgress({ coins: { 7: 3 } }, 7).coins).toEqual({ 7: 3 });
  });

  it('handles missing maps', () => {
    const snap = snapshotStudentProgress({}, 1);
    expect(snap.coins).toEqual({});
    expect(snap.avatars).toEqual({});
    expect(snap.limitedEarned).toEqual({});
  });

  it('covers every progress section', () => {
    const snap = snapshotStudentProgress({
      bossDefeated: { 1: { week1: true } },
      mysteryCount: { 1: 2 },
      avatars: { 1: { color: '#FFF' } },
      limitedEarned: { 1: ['badge_a'] },
      relics: { 1: ['relic_r'] }
    }, 1);
    expect(snap.bossDefeated).toEqual({ 1: { week1: true } });
    expect(snap.mysteryCount).toEqual({ 1: 2 });
    expect(snap.avatars).toEqual({ 1: { color: '#FFF' } });
    expect(snap.limitedEarned).toEqual({ 1: ['badge_a'] });
    expect(snap.relics).toEqual({ 1: ['relic_r'] });
  });
});