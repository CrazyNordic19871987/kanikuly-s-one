// ═════════════════════════════════════════════
//  Каникулы с ONE! — WebP-версии баннеров из Storage
//  Скачивает живые JPG из Supabase Storage (mission_banner/),
//  конвертирует в WebP локально и кладёт готовые файлы в webp-upload/.
//  Файлы из webp-upload/ затем загружаются в дашборде Supabase
//  в ту же папку images/mission_banner/ (сами JPG остаются как fallback).
//  Запуск:  npm run optimize:storage-banners
// ═════════════════════════════════════════════

import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(root, 'webp-upload');
const BASE = 'https://xzmxxnhyvbzdebqhomzd.supabase.co/storage/v1/object/public/images/mission_banner';

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let total = 0;
  for (let id = 1; id <= 10; id++) {
    const jpgUrl = `${BASE}/mission_${id}.JPG`;
    const jpg = await fetch(jpgUrl);
    if (!jpg.ok) {
      console.error(`⚠️  mission_${id}.JPG: HTTP ${jpg.status} — пропускаю`);
      continue;
    }
    const jpgBuf = Buffer.from(await jpg.arrayBuffer());
    const webpBuf = await sharp(jpgBuf).rotate().webp({ quality: 72 }).toBuffer();
    const out = join(OUT_DIR, `mission_${id}.webp`);
    await writeFile(out, webpBuf);
    total += jpgBuf.length - webpBuf.length;
    console.log(`mission_${id}.JPG ${(jpgBuf.length / 1024).toFixed(0)}KB -> ${(webpBuf.length / 1024).toFixed(0)}KB WebP (-${Math.round((1 - webpBuf.length / jpgBuf.length) * 100)}%)`);
  }
  console.log(`Готово. Файлы в webp-upload/ (экономия всего ~${(total / 1024).toFixed(0)}KB).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});