// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import axe from 'axe-core';

const __dirname = dirname(fileURLToPath(import.meta.url));

const STRUCTURAL_RULES = [
  'aria-allowed-role',
  'aria-roles',
  'aria-valid-attr-value',
  'aria-valid-attr',
  'button-name',
  'link-name',
  'duplicate-id',
  'label',
  'nested-interactive',
  'select-name',
  'heading-order',
  'image-alt',
  'landmark-unique',
  'label-title-only',
  'tabindex',
  'form-field-multiple-labels',
  'page-has-heading-one',
  'html-has-lang',
  'meta-viewport'
];

function parseIndexHtml() {
  const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'https://example.test/', runScripts: 'dangerously' });
  dom.window.eval(axe.source);
  return dom.window;
}

async function runAxe(win, rules) {
  return await win.axe.run(win.document, { runOnly: { type: 'rule', values: rules } });
}

describe('a11y: structural axe-core checks on index.html', () => {
  it('has no serious/critical violations on static markup', async () => {
    const win = parseIndexHtml();
    const results = await runAxe(win, STRUCTURAL_RULES);
    const blocking = (results.violations || []).filter(v => ['serious', 'critical'].includes(v.impact));
    expect(blocking).toEqual([]);
  });

  it('every button has an accessible name', async () => {
    const win = parseIndexHtml();
    const results = await runAxe(win, ['button-name']);
    expect(results.violations).toEqual([]);
  });
});