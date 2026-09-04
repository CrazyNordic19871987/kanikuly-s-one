# Changelog

All notable changes to this project will be documented in this file.

## [3.6.2] - 2026-09-04

### Fixed
- **Shift banner images missing after Vite migration**: `img/` (mission banner JPGs + `og-card.png`) were left in the repo root, so Vite did not copy them into `dist/` and they 404'd on GitHub Pages (banners relied on `public/` copying). Moved `img/` → `public/img/` (tracked via `git mv`); Vite now copies them into `dist/img/`, restoring `img/mission{N}-banner.JPG` references used by the SPA (and OG/twitter image URLs).
- **Optional: move banners to Supabase Storage** (`migrations/017_shift_banners_supabase.sql`): documented workflow to upload banners into the `images` Storage bucket under the `mission_banner/` folder (`mission_1.JPG`..`mission_10.JPG`, filename number = `shift_id`) and backfill `content_shifts.banner_url` → `.../public/images/mission_banner/mission_{shift_id}.JPG`. `shiftBannerUrl()` already prefers `banner_url` with `public/img/*` as fallback, so no code change needed. Static files retained as fallback.

### Changed
- **SEO/meta fix in `index.html`**: `og:image`/`twitter:image` switched from the portrait mission banner (720×1280) to the horizontal `img/og-card.png` (1200×630), matching `landing.html` — correct landscape preview for social/messengers. `meta description` reworded from "летние каникулы" → "школьные каникулы" (dates are Oct–Feb, so "summer" contradicted the schedule) and removed the "Anglophone" claim since the UI is fully Russian.

## [3.6.1] - 2026-09-04

### Fixed
- **DISC methodology math**: "4 архетипа, каждый закрывает свои 10% задачи" was mathematically wrong (4×10% = 40%, not 100%). Corrected to **25%** everywhere: panel hero text (`index.html` + `js/app.js`), archetype `desc` fields, the `· 10%` card label now `· 25%`, and the "Синергия 4×10%" heading now "Синергия 4×25%". 4×25% = 100%, matching the stated "вместе — 100% результата". Card/item/relic "+10% к X" bonuses are untouched (they are per-item bonuses, not DISC methodology).

### Changed
- **Accessibility (alt texts)**: image helpers in `js/app.js` no longer emit empty `alt=""`. They now carry meaningful text — `avatarCircle` → participant initials, `avatarImg` → fallback initials, `badgeImg`/`itemImg`/DISC-type images → their emoji. All values passed through `esc()`. This makes loaded images legible to screen readers instead of silently decorative.

## [3.6.0] - 2026-09-04

### Added
- **Vite build pipeline**: `vite.config.js`, `npm run dev` / `npm run build` / `npm run preview`. App now builds to `dist/` and deploys from there. Static assets (bg.png, logo.svg, manifest.json, sw.js, `_nojekyll`) moved to `public/` (Vite copies to dist/). CI: new `build` job runs before deploy, deploys `dist/`.
- `js/*.js` remain plain `<script>` tags (not ES modules) — Vite copies them as-is into `dist/js/`. Full ES-module migration intentionally deferred (no ROI for this vanilla stack, higher regression risk on 4000+ line app.js).

## [3.5.0] - 2026-09-04

### Added
- **ESLint 9** (flat config) + **Prettier** for vanilla browser JS: `npm run lint`, `npm run format`. CI gate: lint runs before tests on every push. 0 errors, 90 warnings (eqeqeq + unused-vars, acceptable).
- **API error handling**: retry (1 attempt with backoff) on network failures, retry on 5xx, offline detection via `navigator.onLine`, toast notifications for: offline, network error, auth expired, server error. Unchanged API surface.
- **Accessibility**: 28 form inputs now have `aria-label`, 2 icon-only buttons labeled, skip-to-content link, `:focus-visible` orange outline, `.sr-only` utility class.
- **PWA**: `manifest.json` + `sw.js` (cache-first for static assets, network-first for API). App is now installable on mobile with offline support for cached content.
- **PDF reports**: `js/pdf.js` — `generatePDF()` generates a printable student report (XP, level, badges, DISC, observations) via `window.print()` with full Cyrillic support.

## [3.4.0] - 2026-09-03

### Added
- Expanded test suite: new `test/dom.test.js` (jsdom environment) validating `esc`/`sanitizeText`/`displayNameEsc` against the **real DOM** (`innerHTML` serialization) with DOMPurify loaded.
- Pure XP-economy helpers `xpFromCompletion(score)` / `xpFromBadge(rarity)` added to `js/logic.js`; `calcStudentXP` in `js/app.js` now delegates to them (single-sourced, testable) — no behavior change.
- `jsdom` added as a dev dependency.
- **36 tests passing** (28 logic + 8 DOM).

### Changed
- `js/app.js` `calcStudentXP` now uses `xpFromCompletion`/`xpFromBadge` from `js/logic.js`.
- Pin `jsdom@^26.1.0` (was `^30.0.1`) — resolves `undici` `webidl.util.markAsUncloneable` crash in CI (GitHub Actions Node 20); still 36/36 tests green.

## [3.3.1] - 2026-09-03

### Added
- CI quality gate (`.github/workflows/deploy.yml`): new `test` job runs `npm ci` + `npm test` (vitest) and `node --check` syntax lint on all browser JS. Deployment now depends on tests passing — broken code won't reach GitHub Pages.

### Note
- CHECK constraints (observations 0..5, completions 0..10, participations.squad 1..10, profiles.role enum, cards.section enum) were already added in migrations 007/011/013; Phase 9 adds the CI gate rather than redundant constraints.

## [3.3.0] - 2026-09-03

### Added
- `js/logic.js` — pure, DOM-free logic module (esc, sanitizeText, displayName, initialsOf, level/XP system, rarityLabel, calcXp, calcCurrency). Exposed on `window` in browser, `module.exports` for Node.
- Test harness: `package.json` + `vitest` (dev-only, `npm test`), `test/logic.test.js` with 23 passing unit tests. No build step — runtime remains static HTML+JS on GitHub Pages.
- `.gitignore` entry for `coverage/`.

### Changed
- `js/app.js` reduced by extracting pure functions into `js/logic.js` (loaded before `app.js`; no runtime behavior change).

## [3.2.2] - 2026-09-03

### Removed
- Broken, unreferenced one-time SQL generator `scripts/generate_sql.js` (and empty `scripts/` dir). Its regex targets (`SHIFTS`, `COMPETENCIES`, `BADGE_DEFS`, `DISC_*`) no longer exist in `js/config.js`, so it could no longer run. Content is already seeded in Supabase via real migrations.

### Verified (retained)
- `getMissionBranch()` and `setAvatar()` — flagged in an earlier audit as "dead", but confirmed **live**: `getMissionBranch` is called by the mission-branch panel (`js/app.js:2172`), `setAvatar` by cosmetic shop items (`js/app.js:1686,1689,1694`). Not removed.

## [3.2.1] - 2026-09-03

### Removed
- Dead `js/auth.js` — duplicate of the inline auth module in `index.html`. It was never loaded by any page and had a less-safe `usernameToEmail` (no username sanitization) than the authoritative inline version, so keeping it was a maintenance/regression risk.

## [3.2.0] - 2026-09-03

### Added
- Gamification state persistence (coins, streaks, relics, bosses, mystery boxes, avatars, limited badges, inventory) to new Supabase `player_progress` table (migration 016)
- `js/progress.js` — load/save/debounce service with per-student snapshot & RLS (own row + admin)
- Vendored DOMPurify 3.1.6 (`js/vendor/purify.min.js`) for XSS defense-in-depth

### Fixed
- Stored XSS: student free-text fields (name, nickname, gender, campus, notes) and observation notes are sanitized on write (`sanitizeText`)
- Escaped student `age`/`gender`/`grade`/`campus` in rendered cards, dropdown options and dashboard (defense-in-depth against presentation-layer XSS)
- Image/avatar/badge `src` URLs already escaped; confirmed and retained

## [3.1.0] - 2026-09-03

### Fixed
- Double coin deduction in shop (`buyShopItem` was calling both `spendCoins` and `addCoins(-50)`)
- Limited badge "Перфекционист" condition string mismatch — badge was never awardable

### Added
- Git tag `v3.0.0-pre-refactor` as baseline before security overhaul
- Backup of key files (`js/app.js`, `js/config.js`, `index.html`) in `backup/`
- Proper `.gitignore` for web project (replaced Dynamics 365 template)

## [3.0.0] - 2026-09-02

- Authentication with admin/player roles via Supabase Auth
- Player accounts linked to student records by username
- RLS recursive admin policies via `is_admin()` security definer
- Profile tab redesign with glass Orbitron chips
- Remove minidrone piloting mission (banned)

## [2.0.0] - 2026-08-01

- 84-card collection system
- DISC profiling with 4 archetypes
- Economy system (NEO-coins, shop, mystery boxes)
- Boss battles
- Legacy relics (cross-shift)
- Streak system
- Limited-time badges
