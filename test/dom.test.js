// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { esc, sanitizeText, displayNameEsc } from '../js/logic.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

beforeAll(() => {
  // Load the vendored DOMPurify into the jsdom global so sanitizeText
  // exercises the REAL sanitizer path (not the Node fallback).
  const src = readFileSync(join(__dirname, '..', 'js', 'vendor', 'purify.min.js'), 'utf8');
  const runInGlobal = new Function(src);
  runInGlobal.call(globalThis);
});

describe('esc() under real DOM', () => {
  it('escapes <> and & like innerHTML serialization', () => {
    expect(esc('<script>')).toBe('&lt;script&gt;');
    expect(esc('a & b')).toBe('a &amp; b');
  });

  it('neutralizes tag delimiters even inside quotes (defensive)', () => {
    // DOM text serialization escapes < > & (quotes stay literal in text,
    // which is safe — see "rejects tag breakout" below).
    expect(esc('" <script> onfocus=')).toBe('" &lt;script&gt; onfocus=');
  });

  it('rejects tag/attribute breakout end-to-end', () => {
    const evil = '<img src=x onerror=alert(1)>';
    const safe = esc(evil);
    // No raw "<" remains, so no tag/attribute can form.
    expect(safe).not.toContain('<');
    expect(safe).not.toContain('>');
    expect(safe).toContain('&lt;');
  });
});

describe('sanitizeText() with DOMPurify loaded', () => {
  it('strips script tags', () => {
    const out = sanitizeText('<script>alert(1)</script>Привет');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('</script>');
    expect(out).toContain('Привет');
  });

  it('removes on* event handlers', () => {
    const out = sanitizeText('<img src=x onerror=alert(1)>');
    expect(out).not.toMatch(/onerror/i);
  });

  it('removes javascript: URIs', () => {
    expect(sanitizeText('<a href="javascript:alert(1)">x</a>')).not.toMatch(/javascript/i);
  });

  it('keeps plain text intact', () => {
    expect(sanitizeText('Иван Петров, 10 лет')).toBe('Иван Петров, 10 лет');
  });
});

describe('displayNameEsc() under real DOM', () => {
  it('neutralizes a malicious nickname', () => {
    const out = displayNameEsc({ nickname: '<b onmouseover=alert(1)>z</b>' });
    // Tag delimiters are escaped, so no <tag onXxx=...> attribute can form.
    expect(out).not.toContain('<b');
    expect(out).not.toContain('</b>');
    expect(out).toContain('&lt;');
  });
});
