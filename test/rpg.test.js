import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calcStudentXP, getStreak, checkAndUpdateStreak, getStreakBonusXP,
  getCoins, addCoins, spendCoins, getEconomyFromCompletions,
  getMysteryCount, incrementMysteryCount, rollMysteryBox, getCurrentBoss,
  isBossDefeated, defeatBoss, getBossTeamDamage, checkLimitedBadges,
  getRelics, awardRelic, getRelicBonus, getAvatar, setAvatar,
  getRecentActivity, getLeaderboard, getFriends, getDiscType,
  getDiscRecommendation, getMissionBranch, getSquadScores, getNearMiss,
  computeInventory
} from '../js/rpg.js';
import { xpFromCompletion, xpFromBadge, getLevel, LEVEL_NAMES } from '../js/logic.js';
import { snapshotStudentProgress } from '../js/progress.js';

function makeState(overrides = {}) {
  return {
    students: [{ id: 1, first_name: 'Иван' }, { id: 2, first_name: 'Аня' }],
    participations: [
      { student_id: 1, shift_id: 1, squad: 2 },
      { student_id: 2, shift_id: 1, squad: 3 }
    ],
    completions: [],
    badges: [],
    coins: {},
    streaks: {},
    mysteryCount: {},
    bossDefeated: {},
    relics: {},
    avatars: {},
    limitedEarned: {},
    inventoryItems: [],
    shifts: [],
    ...overrides
  };
}

function setGlobalHelpers(state) {
  globalThis.state = state;
  globalThis.studentPrimaryShift = (id) => {
    const parts = (state.participations || []).filter(r => String(r.student_id) === String(id));
    return parts.length ? parts[0].shift_id : null;
  };
  globalThis.studentShifts = (id) =>
    (state.participations || []).filter(r => String(r.student_id) === String(id)).map(r => r.shift_id);
  globalThis.studentInAnySquad = (id) => {
    const parts = (state.participations || []).filter(r => String(r.student_id) === String(id));
    return parts.length ? String(parts[0].squad) : null;
  };
  globalThis.squadName = (squad) => {
    const nm = globalThis.SQUAD_NAMES[Number(squad)];
    return (nm && String(nm).trim()) ? String(nm).trim() : ('Команда ' + squad);
  };
}

beforeEach(() => {
  const state = makeState();
  globalThis.state = state;
  globalThis.STREAK_BONUS = [0, 0, 10, 15, 25, 40, 60, 80, 110, 150, 200];
  globalThis.STREAK_MILESTONES = [{ days: 3 }, { days: 7 }, { days: 14 }, { days: 30 }];
  globalThis.MYSTERY_BOX_INTERVAL = 5;
  globalThis.MYSTERY_BOX_POOL = [
    { weight: 70, type: 'xp', value: 25, label: '+25 XP', icon: '⚡' },
    { weight: 30, type: 'coin', value: 10, label: '+10', icon: '🪙' }
  ];
  globalThis.BOSS_BATTLES = [
    { week: 1, name: 'Кибер-Дракон', icon: '🐉', hp: 500, rewards: { xp: 150, coins: 30, badge: 'boss_dragon' } },
    { week: 2, name: 'Терра-Голем', icon: '🗿', hp: 750, rewards: { xp: 200, coins: 40, badge: 'boss_golem' } }
  ];
  globalThis.LIMITED_BADGES = [
    { id: 'limited_speedrunner', name: 'Спидраннер', icon: '⏱️', rarity: 'rare', condition: '3 completions in 1 day', shift_ids: [1, 2, 3] },
    { id: 'limited_perfectionist', name: 'Перфекционист', icon: '💎', rarity: 'epic', condition: '5 perfect scores in a row', shift_ids: [1, 2, 3] },
    { id: 'limited_nightowl', name: 'Ночная Сова', icon: '🦉', rarity: 'rare', condition: 'completion after 20:00', shift_ids: [1, 2, 3] },
    { id: 'limited_explorer', name: 'Исследователь', icon: '🧭', rarity: 'legendary', condition: 'all 7 directions in 1 shift', shift_ids: [1, 2, 3] }
  ];
  globalThis.LEGENDARY_RELICS = [
    { id: 'relic_dragon_scale', name: 'Чешуя Дракона', icon: '🐉', from_shift: 1 },
    { id: 'relic_terra_seed', name: 'Семя Теры', icon: '🌱', from_shift: 2 }
  ];
  globalThis.DISC_MISSION_BOOSTS = {
    D: { label: 'Командир', boost: 'x', icon: '👑', skills: [] },
    I: { label: 'Звездочет', boost: 'x', icon: '⭐', skills: [] },
    S: { label: 'Хранитель', boost: 'x', icon: '🛡️', skills: [] },
    C: { label: 'Мастер', boost: 'x', icon: '🔬', skills: [] }
  };
  globalThis.SQUAD_NAMES = ['', 'Титаны', 'Комета', 'Лисы'];
  globalThis.xpFromCompletion = xpFromCompletion;
  globalThis.xpFromBadge = xpFromBadge;
  globalThis.getLevel = getLevel;
  globalThis.LEVEL_NAMES = LEVEL_NAMES;
  globalThis.snapshotStudentProgress = snapshotStudentProgress;
  globalThis.debouncedSaveProgress = vi.fn();
  setGlobalHelpers(state);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('streak system', () => {
  it('starts a streak at 1 when no prior streak exists', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 1, 10, 0, 0));
    const r = checkAndUpdateStreak(1);
    expect(r.count).toBe(1);
    expect(r.bonus).toBe(0);
    expect(globalThis.state.streaks[1].lastDate).toBe(new Date().toISOString().slice(0, 10));
  });

  it('does not double-count the same day', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 1, 10, 0, 0));
    checkAndUpdateStreak(1);
    expect(checkAndUpdateStreak(1)).toBe(1);
  });

  it('extends the streak on a consecutive day', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 1, 10, 0, 0));
    checkAndUpdateStreak(1);
    vi.setSystemTime(new Date(2026, 5, 2, 10, 0, 0));
    const r = checkAndUpdateStreak(1);
    expect(r.count).toBe(2);
    expect(r.bonus).toBe(10);
  });

  it('resets to 1 after a missed day', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 1, 10, 0, 0));
    checkAndUpdateStreak(1);
    vi.setSystemTime(new Date(2026, 5, 5, 10, 0, 0));
    expect(checkAndUpdateStreak(1).count).toBe(1);
  });

  it('getStreak returns the stored streak or a default', () => {
    expect(getStreak(1)).toEqual({ count: 0, lastDate: '' });
    globalThis.state.streaks[1] = { count: 4, lastDate: '2026-06-01' };
    expect(getStreak(1).count).toBe(4);
  });

  it('getStreakBonusXP maps count to the bonus table', () => {
    globalThis.state.streaks[1] = { count: 3, lastDate: '' };
    expect(getStreakBonusXP(1)).toBe(15);
  });
});

describe('economy', () => {
  it('getCoins defaults to 0', () => {
    expect(getCoins(1)).toBe(0);
  });

  it('addCoins accumulates and persists', () => {
    addCoins(1, 50);
    expect(getCoins(1)).toBe(50);
    expect(globalThis.debouncedSaveProgress).toHaveBeenCalledTimes(1);
    addCoins(1, 25);
    expect(getCoins(1)).toBe(75);
  });

  it('addCoins isolates students', () => {
    addCoins(1, 50);
    expect(getCoins(2)).toBe(0);
  });

  it('spendCoins deducts when affordable', () => {
    addCoins(1, 50);
    expect(spendCoins(1, 30)).toBe(true);
    expect(getCoins(1)).toBe(20);
  });

  it('spendCoins refuses when the balance is too low', () => {
    addCoins(1, 10);
    expect(spendCoins(1, 30)).toBe(false);
    expect(getCoins(1)).toBe(10);
  });

  it('getEconomyFromCompletions sums floor(score*2) plus the balance', () => {
    globalThis.state = makeState({
      completions: [
        { student_id: 1, score: 3 },
        { student_id: 1, score: 4 },
        { student_id: 2, score: 10 }
      ],
      coins: { 1: 10 }
    });
    setGlobalHelpers(globalThis.state);
    expect(getEconomyFromCompletions(1)).toBe(24);
  });
});

describe('mystery box', () => {
  it('getMysteryCount defaults to 0', () => {
    expect(getMysteryCount(1)).toBe(0);
  });

  it('increments silently below the interval', () => {
    for (let i = 0; i < 4; i++) {
      expect(incrementMysteryCount(1)).toBeNull();
    }
    expect(getMysteryCount(1)).toBe(4);
  });

  it('rolls a reward and resets at the interval', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    for (let i = 0; i < 4; i++) incrementMysteryCount(1);
    const reward = incrementMysteryCount(1);
    expect(reward).toEqual(globalThis.MYSTERY_BOX_POOL[0]);
    expect(getMysteryCount(1)).toBe(0);
  });

  it('rollMysteryBox honors weights toward the first item', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(rollMysteryBox()).toEqual(globalThis.MYSTERY_BOX_POOL[0]);
  });

  it('rollMysteryBox reaches the last item on a high roll', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999);
    expect(rollMysteryBox()).toEqual(globalThis.MYSTERY_BOX_POOL[1]);
  });
});

describe('boss battles', () => {
  it('getCurrentBoss falls back to the first boss beyond the table', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2027, 5, 1, 10, 0, 0));
    expect(getCurrentBoss().week).toBe(1);
  });

  it('getCurrentBoss resolves the active week', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 1, 10, 0, 0));
    expect(getCurrentBoss().week).toBe(1);
  });

  it('resolves a second-week boss', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 9, 10, 0, 0));
    expect(getCurrentBoss().week).toBe(2);
  });

  it('isBossDefeated is false by default and defeatBoss marks the week', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 1, 10, 0, 0));
    expect(isBossDefeated(1, 1)).toBe(false);
    const rewards = defeatBoss(1);
    expect(rewards).toEqual({ xp: 150, coins: 30, badge: 'boss_dragon' });
    expect(isBossDefeated(1, 1)).toBe(true);
    expect(globalThis.debouncedSaveProgress).toHaveBeenCalled();
  });

  it('getBossTeamDamage accumulates damage from scores', () => {
    globalThis.state = makeState({
      completions: [
        { student_id: 1, score: 3 },
        { student_id: 1, score: 4 }
      ]
    });
    setGlobalHelpers(globalThis.state);
    expect(getBossTeamDamage(1)).toBe(70);
  });
});

describe('limited-time badges', () => {
  it('earns speedrunner after 3 completions in one day', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 1, 10, 0, 0));
    const today = new Date().toISOString().slice(0, 10);
    globalThis.state = makeState({
      completions: [1, 2, 3].map(n => ({
        student_id: 1, score: 3, created_at: today + 'T10:0' + n + ':00Z', shift_id: 1, direction_name: 'Спорт'
      }))
    });
    setGlobalHelpers(globalThis.state);
    const earned = checkLimitedBadges(1).map(b => b.id);
    expect(earned).toContain('limited_speedrunner');
    expect(globalThis.state.limitedEarned[1]).toContain('limited_speedrunner');
  });

  it('does not earn speedrunner with only 2 completions', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 1, 10, 0, 0));
    const today = new Date().toISOString().slice(0, 10);
    globalThis.state = makeState({
      completions: [1, 2].map(n => ({
        student_id: 1, score: 3, created_at: today + 'T10:0' + n + ':00Z'
      }))
    });
    setGlobalHelpers(globalThis.state);
    expect(checkLimitedBadges(1).map(b => b.id)).not.toContain('limited_speedrunner');
  });

  it('earns perfectionist after 5 perfect scores in a row', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 1, 10, 0, 0));
    const today = new Date().toISOString().slice(0, 10);
    globalThis.state = makeState({
      completions: [1, 2, 3, 4, 5].map(n => ({
        student_id: 1, score: 5, created_at: today + 'T10:00:0' + n + 'Z'
      }))
    });
    setGlobalHelpers(globalThis.state);
    expect(checkLimitedBadges(1).map(b => b.id)).toContain('limited_perfectionist');
  });

  it('does not award perfectionist when the run is broken', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 1, 10, 0, 0));
    const today = new Date().toISOString().slice(0, 10);
    globalThis.state = makeState({
      completions: [5, 3, 5, 5, 5].map((score, i) => ({
        student_id: 1, score, created_at: today + 'T10:00:0' + (i + 1) + 'Z'
      }))
    });
    setGlobalHelpers(globalThis.state);
    expect(checkLimitedBadges(1).map(b => b.id)).not.toContain('limited_perfectionist');
  });

  it('earns nightowl for a completion after 20:00', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 1, 21, 0, 0));
    const today = new Date().toISOString().slice(0, 10);
    globalThis.state = makeState({
      completions: [{ student_id: 1, score: 3, created_at: today + 'T21:00:00Z' }]
    });
    setGlobalHelpers(globalThis.state);
    expect(checkLimitedBadges(1).map(b => b.id)).toContain('limited_nightowl');
  });

  it('earns explorer after visiting all 7 directions in one shift', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 1, 10, 0, 0));
    const today = new Date().toISOString().slice(0, 10);
    const dirs = ['Спорт', 'IT', 'Биотех', 'Медиа', 'Дипломатия', 'Искусство', 'Предпринимательство'];
    globalThis.state = makeState({
      completions: dirs.map((d, i) => ({
        student_id: 1, score: 3, created_at: today + 'T10:00:0' + (i + 1) + 'Z', shift_id: 1, direction_name: d
      }))
    });
    setGlobalHelpers(globalThis.state);
    expect(checkLimitedBadges(1).map(b => b.id)).toContain('limited_explorer');
  });
});

describe('relics', () => {
  it('awardRelic grants the shift relic once', () => {
    const relic = awardRelic(1, 1);
    expect(relic.id).toBe('relic_dragon_scale');
    expect(getRelics(1)).toEqual(['relic_dragon_scale']);
    expect(globalThis.debouncedSaveProgress).toHaveBeenCalled();
  });

  it('awardRelic refuses duplicates', () => {
    awardRelic(1, 1);
    expect(awardRelic(1, 1)).toBeNull();
  });

  it('awardRelic returns null for an unknown shift', () => {
    expect(awardRelic(1, 99)).toBeNull();
  });

  it('getRelicBonus is 10 XP per relic', () => {
    expect(getRelicBonus(1)).toBe(0);
    awardRelic(1, 1);
    awardRelic(1, 2);
    expect(getRelicBonus(1)).toBe(20);
  });
});

describe('avatars', () => {
  it('getAvatar returns the default avatar', () => {
    expect(getAvatar(1)).toEqual({ color: '#3B82F6', icon: '🤖', title: '', frame: '' });
  });

  it('setAvatar merges over the defaults', () => {
    setAvatar(1, { color: '#EF4444', icon: '🔥' });
    expect(getAvatar(1)).toEqual({ color: '#EF4444', icon: '🔥', title: '', frame: '' });
    expect(globalThis.debouncedSaveProgress).toHaveBeenCalled();
  });

  it('setAvatar updates only the provided fields', () => {
    setAvatar(1, { frame: 'gold' });
    expect(getAvatar(1).frame).toBe('gold');
    expect(getAvatar(1).icon).toBe('🤖');
  });
});

describe('social', () => {
  beforeEach(() => {
    globalThis.state = makeState({
      completions: [
        { student_id: 2, score: 5, created_at: '2026-06-01T10:00:00Z' },
        { student_id: 1, score: 1, created_at: '2026-06-02T10:00:00Z' }
      ]
    });
    setGlobalHelpers(globalThis.state);
  });

  it('calcStudentXP sums completion XP', () => {
    expect(calcStudentXP(1)).toBe(35);
    expect(calcStudentXP(2)).toBe(95);
  });

  it('adds badge XP into calcStudentXP', () => {
    globalThis.state.badges = [{ student_id: 1, rarity: 'legendary', earned: true }];
    expect(calcStudentXP(1)).toBe(35 + 100);
  });

  it('getLeaderboard sorts by XP descending', () => {
    const lb = getLeaderboard();
    expect(lb.map(e => e.student.id)).toEqual([2, 1]);
    expect(lb[0].xp).toBe(95);
  });

  it('getFriends returns the neighbours around the student', () => {
    const fr = getFriends(1, 5);
    expect(fr).toHaveLength(2);
  });

  it('getRecentActivity sorts by created_at descending', () => {
    const act = getRecentActivity(10);
    expect(act[0].completion.student_id).toBe(1);
    expect(act[1].completion.student_id).toBe(2);
  });
});

describe('DISC system', () => {
  it('spots D from sport directions', () => {
    globalThis.state = makeState({
      completions: [
        { student_id: 1, score: 5, direction_name: 'Спорт' },
        { student_id: 1, score: 4, direction_name: 'Спорт' }
      ]
    });
    setGlobalHelpers(globalThis.state);
    expect(getDiscType(1)).toBe('D');
  });

  it('spots I from media directions', () => {
    globalThis.state = makeState({
      completions: [{ student_id: 1, score: 5, direction_name: 'Медиа' }]
    });
    setGlobalHelpers(globalThis.state);
    expect(getDiscType(1)).toBe('I');
  });

  it('spots S from diplomacy directions', () => {
    globalThis.state = makeState({
      completions: [{ student_id: 1, score: 5, direction_name: 'Дипломатия' }]
    });
    setGlobalHelpers(globalThis.state);
    expect(getDiscType(1)).toBe('S');
  });

  it('defaults to C when nothing matches', () => {
    globalThis.state = makeState({
      completions: [{ student_id: 1, score: 5, direction_name: 'Наука' }]
    });
    setGlobalHelpers(globalThis.state);
    expect(getDiscType(1)).toBe('C');
  });

  it('getDiscRecommendation follows the DISC type', () => {
    globalThis.state = makeState({
      completions: [{ student_id: 1, score: 5, direction_name: 'Спорт' }]
    });
    setGlobalHelpers(globalThis.state);
    expect(getDiscRecommendation(1)).toEqual(globalThis.DISC_MISSION_BOOSTS.D);
  });

  it('getMissionBranch returns options for the type', () => {
    globalThis.state = makeState({
      completions: [{ student_id: 1, score: 5, direction_name: 'Спорт' }]
    });
    setGlobalHelpers(globalThis.state);
    const branch = getMissionBranch(1);
    expect(branch.a.name).toBe('Лидерская миссия');
    expect(branch.b.icon).toBe('🎯');
  });
});

describe('squad scores', () => {
  it('aggregates XP by squad with members and badges', () => {
    globalThis.state = makeState({
      completions: [{ student_id: 1, score: 5 }],
      badges: [{ student_id: 1, rarity: 'rare', earned: true }]
    });
    setGlobalHelpers(globalThis.state);
    const sq = getSquadScores();
    expect(sq).toHaveLength(2);
    const kometa = sq.find(s => s.name === 'Комета');
    expect(kometa.members).toBe(1);
    expect(kometa.totalXP).toBe(95 + 40);
    expect(kometa.badges).toBe(1);
  });

  it('labels unassigned students as Без команды', () => {
    globalThis.state = makeState({ participations: [] });
    setGlobalHelpers(globalThis.state);
    const sq = getSquadScores();
    expect(sq[0].name).toBe('Без команды');
    expect(sq[0].members).toBe(2);
  });
});

describe('getNearMiss', () => {
  it('reports XP needed to the next level', () => {
    const nm = getNearMiss(1);
    expect(nm.currentLevel).toBe(1);
    expect(nm.nextLevel).toBe(2);
    expect(nm.nextLevelName).toBe(LEVEL_NAMES[1]);
    expect(nm.needed).toBe(350);
  });

  it('returns null at max level', () => {
    globalThis.state = makeState({
      completions: Array.from({ length: 60 }, () => ({ student_id: 1, score: 10 }))
    });
    setGlobalHelpers(globalThis.state);
    expect(getNearMiss(1)).toBeNull();
  });
});

describe('computeInventory', () => {
  it('returns base slots and only common items with no completions', () => {
    const inv = computeInventory(1);
    expect(inv.shiftName).toBe('Кибер-Атлеты');
    expect(inv.maxSlots).toBe(6);
    expect(inv.items).toHaveLength(3);
    expect(inv.items.every(i => i.rarity === 'common')).toBe(true);
  });

  it('unlocks rare items after 2 completions', () => {
    globalThis.state = makeState({
      completions: [
        { student_id: 1, score: 3, direction_name: 'Спорт' },
        { student_id: 1, score: 4, direction_name: 'Спорт' }
      ]
    });
    setGlobalHelpers(globalThis.state);
    const inv = computeInventory(1);
    expect(inv.items.some(i => i.rarity === 'rare')).toBe(true);
    expect(inv.items).toHaveLength(5);
    expect(inv.maxSlots).toBe(6);
  });

  it('unlocks a legendary item after a 5/5 completion', () => {
    globalThis.state = makeState({
      participations: [{ student_id: 1, shift_id: 9, squad: 1 }],
      completions: [{ student_id: 1, score: 5, direction_name: 'Спорт' }]
    });
    setGlobalHelpers(globalThis.state);
    const inv = computeInventory(1);
    expect(inv.shiftName).toBe('Champions Academy');
    expect(inv.items.some(i => i.id === 'champ_belt')).toBe(true);
  });

  it('prefers DB inventory items when available', () => {
    globalThis.state = makeState({
      inventoryItems: [{ shift_id: 1, id: 'custom_1', icon: '🔮', name: 'Кастом', rarity: 'common', bonus: 'x' }],
      shifts: [{ id: 1, name: 'Кибер-Атлеты' }]
    });
    setGlobalHelpers(globalThis.state);
    const inv = computeInventory(1);
    expect(inv.items[0].id).toBe('custom_1');
    expect(inv.shiftName).toBe('Кибер-Атлеты');
  });

  it('caps slots at 12 and grows every 3 completions', () => {
    globalThis.state = makeState({
      completions: Array.from({ length: 20 }, () => ({ student_id: 1, score: 3, direction_name: 'Спорт' }))
    });
    setGlobalHelpers(globalThis.state);
    expect(computeInventory(1).maxSlots).toBe(12);
  });
});