import { describe, it, expect } from 'vitest';
import {
  esc,
  sanitizeText,
  displayName,
  displayNameEsc,
  initialsOf,
  LEVEL_NAMES,
  xpToNextLevel,
  getLevel,
  rarityLabel,
  calcXp,
  calcCurrency
} from '../js/logic.js';

describe('esc()', () => {
  it('returns empty string for falsy input', () => {
    expect(esc('')).toBe('');
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });

  it('escapes HTML metacharacters', () => {
    expect(esc('<script>')).toBe('&lt;script&gt;');
    expect(esc('a&b')).toBe('a&amp;b');
    expect(esc('say "hi"')).toContain('&quot;');
  });

  it('leaves plain text unchanged', () => {
    expect(esc('Иван')).toBe('Иван');
  });
});

describe('sanitizeText()', () => {
  it('strips script tags', () => {
    const out = sanitizeText('<script>alert(1)</script>Привет');
    expect(out).not.toContain('script');
    expect(out).not.toContain('<');
    expect(out).toContain('Привет');
  });

  it('strips inline event handlers', () => {
    const out = sanitizeText('<img src=x onerror=alert(1)>');
    expect(out).not.toMatch(/onerror/i);
  });

  it('removes javascript: scheme', () => {
    expect(sanitizeText('javascript:alert(1)')).not.toMatch(/javascript/i);
  });

  it('keeps normal text', () => {
    expect(sanitizeText('Иван Петров')).toBe('Иван Петров');
  });
});

describe('displayName()', () => {
  it('returns empty for falsy student', () => {
    expect(displayName(null)).toBe('');
    expect(displayName(undefined)).toBe('');
  });

  it('prefers nickname', () => {
    expect(displayName({ nickname: 'Кибер', first_name: 'Иван', last_name: 'Петров' })).toBe('Кибер');
    expect(displayName({ nick_name: 'Чемп', first_name: 'Иван' })).toBe('Чемп');
  });

  it('falls back to first+last name', () => {
    expect(displayName({ first_name: 'Иван', last_name: 'Петров' })).toBe('Иван Петров');
  });
});

describe('displayNameEsc()', () => {
  it('escapes a malicious nickname', () => {
    expect(displayNameEsc({ nickname: '<script>x</script>' })).toBe('&lt;script&gt;x&lt;/script&gt;');
  });
});

describe('initialsOf()', () => {
  it('uses up to 2 letters of nickname', () => {
    expect(initialsOf({ nickname: 'Кибер' })).toBe('КИ');
  });

  it('uses first+last name initials', () => {
    expect(initialsOf({ first_name: 'Иван', last_name: 'Петров' })).toBe('ИП');
  });

  it('handles missing names', () => {
    expect(initialsOf({})).toBe('');
  });
});

describe('xpToNextLevel()', () => {
  it('is infinite at max level', () => {
    expect(xpToNextLevel(10)).toBe(Infinity);
    expect(xpToNextLevel(12)).toBe(Infinity);
  });

  it('scales linearly below max', () => {
    expect(xpToNextLevel(1)).toBe(350);
    expect(xpToNextLevel(2)).toBe(500);
  });
});

describe('getLevel()', () => {
  it('starts at level 1 for zero XP', () => {
    expect(getLevel(0).level).toBe(1);
    expect(getLevel(0).name).toBe(LEVEL_NAMES[0]);
  });

  it('levels up past thresholds', () => {
    expect(getLevel(350).level).toBe(2);
    expect(getLevel(900).level).toBe(3);
  });

  it('caps at level 10 (Легенда)', () => {
    const max = getLevel(999999);
    expect(max.level).toBe(10);
    expect(max.progress).toBe(100);
  });

  it('computes progress within a level', () => {
    const lv = getLevel(175);
    expect(lv.level).toBe(1);
    expect(lv.progress).toBeGreaterThanOrEqual(0);
    expect(lv.progress).toBeLessThanOrEqual(100);
  });
});

describe('rarityLabel()', () => {
  it('maps known rarities and passes through unknown', () => {
    expect(rarityLabel('common')).toBe('Обычный');
    expect(rarityLabel('legendary')).toBe('Легендарный');
    expect(rarityLabel('mythic')).toBe('mythic');
  });
});

describe('calcXp() / calcCurrency()', () => {
  it('calculates XP from score', () => {
    expect(calcXp(0)).toBe(0);
    expect(calcXp(10)).toBe(200);
  });

  it('calculates currency from score', () => {
    expect(calcCurrency(5, null)).toBe(50);
  });
});
