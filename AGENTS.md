# AGENTS.md — Каникулы с ONE!

## Project Overview

Summer camp management web app for kids 7-12. Vanilla JS SPA built with Vite (`npm run build` → `dist/`) and hosted on GitHub Pages.

- **Repo**: `https://github.com/CrazyNordic19871987/kanikuly-s-one`
- **Live**: `https://crazynordic19871987.github.io/kanikuly-s-one/`
- **Supabase**: `https://xzmxxnhyvbzdebqhomzd.supabase.co`
- **GitHub user**: `CrazyNordic19871987` (gh CLI authed)

## Architecture

- `index.html` — single HTML page, all CSS inline (~1000 lines)
- `js/app.js` — main application JS (single source of truth; the former root `app.js` duplicate was removed)
- `js/logic.js` — pure, DOM-free logic (esc, sanitizeText, displayName, initialsOf, level/XP system, rarityLabel, calcXp, calcCurrency). Browser: exposed on `window` (loaded before `app.js`). Node/tests: `module.exports`. **Never put `state`/`document`/`api`/`auth*` logic here** — it must stay importable by vitest.
- `js/config.js` — Supabase URL/key + TABLES constants + DEFAULT_* fallbacks (single source of truth; the former root `config.js` duplicate was removed)
- `js/api.js` — Supabase REST wrapper with pagination + retry/offline handling
- `js/pdf.js` — printable student report generation via `window.print()`
- `js/progress.js` — player_progress persistence
- `public/` — static assets copied verbatim to `dist/` by Vite (bg.png, logo.svg, manifest.json, sw.js, _nojekyll, and `img/` for mission banners + og-card.png). **Any file referenced by the app at a root-relative path must live under `public/` (or be copied to `dist/`), otherwise it 404s on the live site.**
- `migrations/` — SQL for indexes, RLS
- `test/` — vitest unit tests (`npm test` runs them). `js/logic.js` is tested here.
- `програма/` — pedagogical program files for missions 1-6 (.md)
- `player/` — player-facing components/views
- `gen-og.js` / `gen-og.ps1` — OpenGraph image generators (Node + PS wrapper)
- `kanikuly_cards_collection.md`, `Миссии_для_педагогов.md`, `gamma_presentation_prompt.md` — content/presentation docs
- `presentation_kanikuly_s_one.html` — standalone presentation page (not part of the SPA)
- `*.pptx` — marketing deck sources (MS PowerPoint), not build inputs
- No framework, no npm runtime deps. Vanilla JS + CSS. Vite exists for build/dev; `js/*.js` are still plain `<script>` tags (not ES modules) — Vite copies them as-is into `dist/js/`.
- Deploy pipeline: `npm run lint` → `npm test` → `npm run build` → upload `dist/` → GitHub Pages.

## Color Palette

```css
--bg: #1B2838;
--orange: #E8A838;
--green: #7CB342;
--sky: #64B5F6;
--white: #F0EDE5;
--muted: rgba(240,237,229,0.5);
```

## Key Data Model

**Runtime tables** (Supabase): students, observations, badges, completions
**Content tables**: content_shifts, content_competencies, content_badge_definitions, content_disc_config, content_missions

- `content_shifts` has **NO `name` column** — the field is `title` with angle brackets `<...>`. Fix applied: `name: (s.title || s.name || ('Миссия ' + s.shift_id)).replace(/^<|>$/g, '').trim()`
- 10 shifts: КИБЕР-АТЛЕТЫ, TERRAFORMING, META-AGENCY, FUTURE MAKERS, ACTIVE TECH 2077, URBAN QUEST, SMART CITY LAB, ENGLISH GAME STUDIO, CHAMPIONS ACADEMY, ISLAND SURVIVAL
- 84 badge definitions in content_badge_definitions
- 8 competencies in content_competencies

## Terminology (UI)

- "Смены" → **"Миссии"** (shifts)
- "Миссии" (inner) → **"Задания"** (missions within a shift)
- "лагерь" → **"каникулы"** everywhere

## Common Commands

```bash
# Build to dist/ (Vite) — CI does this before deploy
npm run build

# Run unit tests (dev)
npm test

# Lint
npm run lint

# Local dev server (optional)
npm run dev
```

Deploy = git push to master (GitHub Actions builds with Vite + deploys dist/)

## RPG System

- **XP + Level** (10 levels: Новичок → Легенда)
- **Inventory** (5 items per shift, unlocked by completions)
- **84 Badge definitions** with themed emoji icons per direction
- **Player Profile page** with 7 tabs: Skills, Badges, Inventory, Shifts, History, DISC, Recommendations
- **Radar chart** — 400x400 canvas, DPR-scaled, responsive (`isMobile` at <380px)
- `drawRadar()` uses `getCanvasSize()` helper, resize listener with 200ms debounce

## Rules for Agents

1. **Edit files in `js/` only** — `js/app.js`, `js/config.js`, `js/api.js`. There are no root-level JS duplicates anymore; don't recreate them.
2. **Never remove existing features** — only add or fix
3. **Use existing CSS variables** — don't hardcode colors
4. **Test with `webfetch`** on live site after pushing
5. **Commit messages**: `feat:`, `fix:`, `docs:`, `chore:` prefixes
6. **No comments in code** unless user asks
7. **Keep files under 50KB** — split if larger
8. **Russian language** for all UI text
9. **Print CSS** exists for report generation — preserve it
10. **Cache busting**: increment `?v=N` on script tags when changing JS

## Known Issues / History

- OpenAI API key was removed. App uses local rule-based engine `analyzeStudentProfile`
- Supabase CLI has execution policy issues on Windows
- GitHub Pages caching can be persistent — use incognito or disable cache in DevTools
- `curl` alias in PowerShell conflicts with `Invoke-WebRequest` — use webfetch tool instead
