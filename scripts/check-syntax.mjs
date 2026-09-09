// ═════════════════════════════════════════════
//  Каникулы с ONE! — Проверка синтаксиса JS
//  Парсит index.html, извлекает <script src="js/...">
//  и прогоняет `node --check` по каждому локальному файлу.
//  Запуск:  npm run check        (или в CI: node scripts/check-syntax.mjs)
//  Успех:   exit 0, 0 ошибок
//  Провал:  exit 1, выведены файлы с ошибкой
// ═════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

function extractScriptSrcs(html) {
  const srcs = [];
  const re = /<script[^>]+src=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(html)) !== null) srcs.push(m[1]);
  return srcs;
}

function isLocalJs(src) {
  if (/^(https?:)?\/\//.test(src)) return false;
  const pathOnly = src.split('?')[0].split('#')[0];
  return pathOnly.startsWith('js/') && pathOnly.endsWith('.js');
}

function check(src) {
  const pathOnly = src.split('?')[0].split('#')[0];
  const file = join(root, pathOnly);
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    return { ok: true };
  } catch (err) {
    return { ok: false, detail: (err.stderr || err.message || '').toString().trim() };
  }
}

function main() {
  const srcs = extractScriptSrcs(html).filter(isLocalJs);
  if (!srcs.length) {
    console.error('В index.html не найдено ни одного локального <script src="js/...">');
    process.exit(1);
  }

  const results = srcs.map((s) => ({ src: s, ...check(s) }));
  const failed = results.filter((r) => !r.ok);

  for (const r of results) {
    if (r.ok) {
      console.log(`OK   ${r.src}`);
    } else {
      console.error(`FAIL ${r.src}\n${r.detail}`);
    }
  }
  console.log(`\n${results.length} файл(ов) проверено, ошибок: ${failed.length}`);
  if (failed.length) process.exit(1);
}

main();