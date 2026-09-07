// ═════════════════════════════════════════════
//  Каникулы с ONE! — Оптимизация изображений
//  Конвертирует локальные баннеры-фолбэки в WebP.
//  Запуск:  npm run optimize:images
//  Вход:    public/img/mission{N}-banner.JPG
//  Выход:   public/img/mission{N}-banner.webp  (JPG остаётся как fallback)
// ═════════════════════════════════════════════

import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imgDir = join(root, 'public', 'img');

async function main() {
  const entries = readdirSync(imgDir).filter((f) => /^mission\d+-banner\.JPG$/i.test(f));
  if (!entries.length) {
    console.error('Баннеры mission{N}-banner.JPG не найдены в public/img/');
    process.exit(1);
  }
  for (const file of entries) {
    const src = join(imgDir, file);
    const out = join(imgDir, file.replace(/\.JPG$/i, '.webp'));
    const orig = (await sharp(src).metadata()).size || 0;
    const buf = await sharp(src).rotate().webp({ quality: 72 }).toBuffer();
    await writeFile(out, buf);
    console.log(`${file}: ${(orig / 1024).toFixed(0)}KB -> ${(buf.length / 1024).toFixed(0)}KB WebP (${Math.round((1 - buf.length / orig) * 100)}%)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});