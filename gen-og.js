const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const W = 1200, H = 630;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillRoundRect(x, y, w, h, r, color) {
  ctx.fillStyle = color;
  roundRect(x, y, w, h, r);
  ctx.fill();
}

// ── Background ──
const bg = ctx.createLinearGradient(0, 0, W, H);
bg.addColorStop(0, '#0f1923');
bg.addColorStop(0.5, '#1B2838');
bg.addColorStop(1, '#0f1923');
ctx.fillStyle = bg;
ctx.fillRect(0, 0, W, H);

// ── Grid ──
ctx.strokeStyle = 'rgba(255,255,255,0.03)';
ctx.lineWidth = 1;
for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

// ── Glow ──
const glow = ctx.createRadialGradient(900, 200, 0, 900, 200, 400);
glow.addColorStop(0, 'rgba(232,168,56,0.06)');
glow.addColorStop(1, 'transparent');
ctx.fillStyle = glow;
ctx.fillRect(0, 0, W, H);

// ── Left accent bar ──
ctx.fillStyle = '#E8A838';
ctx.fillRect(0, 0, 6, H);

// ── MISSION badge ──
fillRoundRect(40, 40, 130, 32, 8, 'rgba(232,168,56,0.15)');
ctx.font = '600 12px Inter, Segoe UI, sans-serif';
ctx.fillStyle = '#E8A838';
ctx.textAlign = 'left';
ctx.fillText('МИССИЯ 1', 52, 61);

// ── Title ──
ctx.font = '800 36px Inter, Segoe UI, sans-serif';
ctx.fillStyle = '#F0EDE5';
ctx.fillText('\u00AB\u041A\u0438\u0431\u0435\u0440-\u0410\u0442\u043B\u0435\u0442\u044B:', 40, 105);
ctx.fillText('\u0425\u0440\u043E\u043D\u0438\u043A\u0438 \u0411\u0443\u0434\u0443\u0449\u0435\u0433\u043E\u00BB', 40, 150);

// ── Subtitle ──
ctx.font = '700 16px Inter, Segoe UI, sans-serif';
ctx.fillStyle = '#E8A838';
ctx.fillText('PHYGITAL & SCI-FI', 40, 190);

// ── Date pill ──
fillRoundRect(40, 210, 280, 34, 8, 'rgba(232,168,56,0.85)');
ctx.font = '700 14px Inter, Segoe UI, sans-serif';
ctx.fillStyle = '#fff';
ctx.fillText('\uD83D\uDCC5  05.10 \u2013 09.10.2026', 54, 233);

// ── Legend section ──
ctx.font = '700 11px Inter, Segoe UI, sans-serif';
ctx.fillStyle = '#E8A838';
ctx.fillText('\uD83D\uDCD6 \u041B\u0435\u0433\u0435\u043D\u0434\u0430', 40, 275);
ctx.font = '500 13px Inter, Segoe UI, sans-serif';
ctx.fillStyle = 'rgba(240,237,229,0.65)';
ctx.fillText('\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438 \u2014 \u00AB\u0410\u0433\u0435\u043D\u0442\u044B \u0411\u0443\u0434\u0443\u0449\u0435\u0433\u043E\u00BB \u0432 \u0441\u0435\u043A\u0440\u0435\u0442\u043D\u043E\u0439 \u0430\u043A\u0430\u0434\u0435\u043C\u0438\u0438.', 40, 298);
ctx.fillText('\u0418\u0445 \u0437\u0430\u0434\u0430\u0447\u0430 \u2014 \u0441\u043F\u0430\u0441\u0442\u0438 \u0446\u0438\u0444\u0440\u043E\u0432\u0443\u044E \u0432\u0441\u0435\u043B\u0435\u043D\u043D\u0443\u044E,', 40, 320);
ctx.fillText('\u0440\u0430\u0437\u0432\u0438\u0432\u0430\u044F \u0444\u0438\u0437\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0438 \u0438\u043D\u0442\u0435\u043B\u043B\u0435\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0435 \u0441\u043F\u043E\u0441\u043E\u0431\u043D\u043E\u0441\u0442\u0438.', 40, 342);

// ── Tags ──
const tags = ['\uD83C\uDFC5 \u0421\u043F\u043E\u0440\u0442', '\uD83D\uDCBB IT', '\uD83E\uDDEC \u0411\u0438\u043E\u0442\u0435\u0445', '\uD83D\uDCCA \u041F\u0440\u0435\u0434\u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u043E'];
let tx = 40;
ctx.font = '600 11px Inter, Segoe UI, sans-serif';
tags.forEach(tag => {
  const tw = ctx.measureText(tag).width + 24;
  fillRoundRect(tx, 378, tw, 28, 6, 'rgba(255,255,255,0.06)');
  ctx.fillStyle = 'rgba(240,237,229,0.6)';
  ctx.fillText(tag, tx + 12, 397);
  tx += tw + 8;
});

// ── RIGHT SIDE: Game UI ──

// Icon badges
fillRoundRect(750, 40, 110, 42, 10, 'rgba(255,255,255,0.04)');
ctx.font = '18px serif';
ctx.fillText('\u2694\uFE0F', 762, 68);
ctx.font = '700 11px Inter, Segoe UI, sans-serif';
ctx.fillStyle = '#7CB342';
ctx.fillText('XP \u00D7 2', 790, 66);

fillRoundRect(870, 40, 110, 42, 10, 'rgba(255,255,255,0.04)');
ctx.font = '18px serif';
ctx.fillStyle = '#F0EDE5';
ctx.fillText('\uD83C\uDFC6', 882, 68);
ctx.font = '700 11px Inter, Segoe UI, sans-serif';
ctx.fillStyle = '#E8A838';
ctx.fillText('\u0411\u041E\u0421\u0421', 910, 66);

fillRoundRect(990, 40, 110, 42, 10, 'rgba(255,255,255,0.04)');
ctx.font = '18px serif';
ctx.fillStyle = '#F0EDE5';
ctx.fillText('\uD83C\uDFB2', 1002, 68);
ctx.font = '700 11px Inter, Segoe UI, sans-serif';
ctx.fillStyle = '#64B5F6';
ctx.fillText('\u0422\u0417\u041A', 1030, 66);

// Level bar
ctx.font = '600 12px Inter, Segoe UI, sans-serif';
ctx.fillStyle = 'rgba(240,237,229,0.4)';
ctx.textAlign = 'left';
ctx.fillText('\u0423\u0420\u041E\u0412\u0415\u041D\u042C', 750, 110);
fillRoundRect(750, 120, 400, 14, 7, 'rgba(255,255,255,0.06)');
fillRoundRect(750, 120, 270, 14, 7, '#7CB342');
ctx.font = '700 10px Inter, Segoe UI, sans-serif';
ctx.fillStyle = '#fff';
ctx.fillText('260 / 400 XP', 762, 131);

// Streak
ctx.font = '36px serif';
ctx.textAlign = 'center';
ctx.fillText('\uD83D\uDD25', 810, 210);
ctx.font = '800 26px Inter, Segoe UI, sans-serif';
ctx.fillStyle = '#E8A838';
ctx.fillText('5', 810, 250);
ctx.font = '500 11px Inter, Segoe UI, sans-serif';
ctx.fillStyle = 'rgba(240,237,229,0.4)';
ctx.fillText('\u0434\u043D\u0435\u0439 \u043F\u043E\u0434\u0440\u044F\u0434', 810, 270);

// Coins
ctx.font = '36px serif';
ctx.fillText('\uD83E\uDE99', 960, 210);
ctx.font = '800 26px Inter, Segoe UI, sans-serif';
ctx.fillStyle = '#E8A838';
ctx.fillText('1,250', 960, 250);
ctx.font = '500 11px Inter, Segoe UI, sans-serif';
ctx.fillStyle = 'rgba(240,237,229,0.4)';
ctx.fillText('\u043C\u043E\u043D\u0435\u0442', 960, 270);

// Squad
ctx.font = '36px serif';
ctx.fillText('\uD83D\uDEE1\uFE0F', 1090, 210);
ctx.font = '700 14px Inter, Segoe UI, sans-serif';
ctx.fillStyle = '#64B5F6';
ctx.fillText('\u0424\u041B\u0410\u0414\u0416\u0418\u041D\u0413', 1090, 250);
ctx.font = '500 11px Inter, Segoe UI, sans-serif';
ctx.fillStyle = 'rgba(240,237,229,0.4)';
ctx.fillText('\u043E\u0442\u0440\u044F\u0434 \u00B7 4/5', 1090, 270);

// Avatar
ctx.beginPath();
ctx.arc(1000, 380, 50, 0, Math.PI * 2);
ctx.fillStyle = 'rgba(100,181,246,0.15)';
ctx.fill();
ctx.strokeStyle = 'rgba(100,181,246,0.4)';
ctx.lineWidth = 2;
ctx.stroke();
ctx.font = '36px serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('\uD83E\uDDD1\u200D\uD83D\uDE80', 1000, 380);
ctx.textBaseline = 'alphabetic';
ctx.font = '700 13px Inter, Segoe UI, sans-serif';
ctx.fillStyle = '#F0EDE5';
ctx.fillText('\u0410\u043B\u0435\u043A\u0441\u0435\u0439, 10 \u043B\u0435\u0442', 1000, 450);
ctx.font = '500 11px Inter, Segoe UI, sans-serif';
ctx.fillStyle = 'rgba(240,237,229,0.4)';
ctx.fillText('\u0423\u0440\u043E\u0432\u0435\u043D\u044C 5 \u00B7 \u041B\u0435\u0433\u0435\u043D\u0434\u0430', 1000, 470);

// ── Bottom bar ──
ctx.fillStyle = 'rgba(255,255,255,0.04)';
ctx.fillRect(0, H - 50, W, 50);
ctx.font = '700 16px Inter, Segoe UI, sans-serif';
ctx.fillStyle = '#E8A838';
ctx.textAlign = 'left';
ctx.fillText('\u041A\u0410\u041D\u0418\u041A\u0423\u041B\u042B \u0421 ONE!', 40, H - 20);
ctx.font = '500 12px Inter, Segoe UI, sans-serif';
ctx.fillStyle = 'rgba(240,237,229,0.4)';
ctx.textAlign = 'right';
ctx.fillText('Phygital-\u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u0434\u043B\u044F \u0434\u0435\u0442\u0441\u043A\u0438\u0445 \u043A\u0430\u043D\u0438\u043A\u0443\u043B', W - 40, H - 20);

// ── Save ──
const outDir = path.join(__dirname, 'img');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'og-card.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outPath, buffer);
console.log('OK:', outPath);
