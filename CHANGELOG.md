# Changelog

All notable changes to this project will be documented in this file.

## [3.8.5] - 2026-09-08

### Accessibility (Phase D)
- **Keyboard navigation (D1)**: 9 clickable `<div onclick>` in `js/app.js` (topbar logo/title, student cards, shop items, mission-branch cards, dashboard student cards, shift cards, assessment direction headers) + equivalent static ones in `index.html` (sidebar logo, topbar, user badge, menu overlay) now support Enter/Space via a delegated `keydown` handler (`role="button"`/`data-card-action` + `tabindex`). Card actions don't conflict with nested real buttons (which stop propagation).
- **Touch targets (D2)**: raised below-44px interactive elements to ≥44px min touch area — `.mobile-menu-toggle` (40→44), `.mobile-back-btn` (36→44), `.star` (36→44), `.sc-delete` (24→44), plus `min-height:44px` on `.btn-sm`, `.btn-print`, `.btn-primary`, `.pp-tab`, `.filter-pill`, `.day-pill`, `.shift-mission-toggle`, `.export-center-item`, `.auth-btn`.
- **Contrast (D3)**: `.auth-hint` (0.68rem small text) switched `--muted2` → `--muted` to meet WCAG AA 4.5:1; placeholders keep `--muted2` (exempt from WCAG 1.4.3).
- **Fonts (D4)**: added `<link rel="preconnect">` to `fonts.googleapis.com` + `fonts.gstatic.com` (crossorigin). All 3 families kept (Space Grotesk = body, Orbitron = headings, JetBrains Mono = numerics, 12 usages).
- **CI a11y detection (D5)**: added `axe-core` devDep + `test/a11y.test.js` — 19 structural WCAG rules run on static `index.html` in jsdom during `npm test` (runs in CI test step). Currently 0 violations.

## [3.8.4] - 2026-09-08

### Changed (Phase C: CSS split + token rename)
- **Inline `<style>` block (~104KB) removed from `index.html`**; split into 8 files under `css/`: `base.css` (tokens/reset/body/loader/toast/student-select/focus-visible), `layout.css` (sidebar/topbar/mobile menu/page container/auth screen), `students.css` (participants), `shifts.css` (tasks/dashboard/shifts/assessment/shift-dashboard), `profile.css` (achievements/RPG profile/gamification/card collection/DISC/tiles), `report.css` (game report), `print.css` (`@media print`), `responsive.css` (all scattered `@media(max-width…)`).
- **Token rename**: `--orange → --accent`, `--green → --gold` with legacy aliases (`--orange: var(--accent)`, `--green: var(--gold)`). Computed values unchanged; old names keep working.
- **`vite.config.js`**: added `base: './'` so the CSS bundle uses a relative path (works on GitHub Pages sub-path).
- **Old inline CSS preserved** in `backup/old-style-v3.8.3.html`.
- Vite now emits a single minified `assets/index-*.css` from the 8 source files (cache-busted by content hash).
- `AGENTS.md` palette + `README.md` updated to canonical `--accent`/`--gold`.

## [3.8.3] - 2026-09-08

### Changed
- **AGENTS.md palette corrected**: CSS `:root` tokens now accurately documented. Note added: `--orange` stores blue `#3B82F6` and `--green` stores yellow `#FBBF24` — rename to `--accent`/`--gold` planned for Phase C CSS split.
- **README.md drift fixed**: version badge updated 3.0.0 → 3.8.3; migrations table now lists 001–019; RLS description updated to reflect current state (public signup disabled, PII locked); JS file structure corrected; color palette table now matches actual CSS variables.
- **SEO**: added `<link rel="canonical">`, removed `#shifts` from `og:url`, added `public/sitemap.xml` and `public/robots.txt`.
- **`<noscript>` accuracy**: "Каждая смена длится 5 дней" → "Смены длятся от 5 до 10 дней" (shifts 1–4 = 5 days, 5–10 = 10 days per `SHIFT_DATES`).
- **`js/progress.js` privacy**: `snapshotStudentProgress` now slices only the current `studentId` entries instead of persisting the entire multi-student map into every row.

## [3.8.2] - 2026-09-08

### Security
- **Role escalation closed (CRITICAL)**: self-registered users could promote themselves to `admin` — `profiles_insert_own`/`profiles_update_own` never restricted the `role` column. New `migrations/019_security_hardening.sql` adds trigger `trg_profiles_role` (`prevent_admin_escalation()`): only an existing admin can write `role='admin'`. Verified live: an exploit PoC created a throwaway account, read all children and granted itself admin — both now blocked after the migration.
- **PII lockdown (CRITICAL)**: any authenticated user could read the entire children database (students/observations/badges/completions/participations) via `auth_select_*` policies with `auth.role()='authenticated'`. Migration 019 replaces them with own-only policies (`students.user_id = auth.uid()`) + `is_admin()` for admins, plus `own_select_claimable` (an unclaimed child whose `username` equals the player's login stays auto-claimable after first login).
- **Username takeover closed**: trigger `trg_profiles_username` blocks non-admin username changes (username = login = `email@kanikuly.auth`, and renaming was the vector to "rename onto" an unclaimed child and claim them).
- **Storage avatar cross-tenant writes closed**: `migrations/018` let any authenticated user overwrite/delete anyone's avatar. Migration 019 re-scopes INSERT/UPDATE/DELETE on `storage.objects` through security-definer `can_manage_avatar(name)` — only the owner's own child (`avatars/{student_id}.{ext}`) or admins; public read kept for `<img>` display.
- **Public signup removed from UI**: the «Регистрация» tab is hidden (login only) in `index.html`; accounts are created by the administrator (Supabase Dashboard → Users). Dashboard-level "Disable new signups" is the recommended follow-up (manual).

### Changed
- **Dead config removed**: duplicated `AUTH_EMAIL_DOMAIN` deleted from `js/config.js` (single source of truth is the inline auth module in `index.html`).

### Migration
- **Run `migrations/019_security_hardening.sql`** in Supabase Dashboard → SQL Editor once (idempotent), then delete the throwaway audit users: `DELETE FROM auth.users WHERE email LIKE 'audit%@kanikuly.auth';`

## [3.8.1] - 2026-09-07

### Added
- **WebP banners from Storage**: `npm run optimize:storage-banners` (`scripts/optimize-storage-banners.mjs`) downloads the 10 live `mission_banner/mission_{N}.JPG` files from Supabase Storage, converts them to WebP (~55–63% lighter) and saves ready files into `webp-upload/` (gitignored) for a manual drag-and-drop upload back into the `images/mission_banner/` folder. No SQL, no credentials needed.

### Changed
- **Banner loading prefers WebP**: `shiftBannerUrl()` now swaps `…/mission_banner/mission_{N}.JPG` storage URLs to `.webp`; `bannerOnerror()` generalizes the `.webp → .JPG` fallback (the storage filename `mission_N.webp` no longer matched the old `banner.webp` pattern). The old JPGs stay in Storage as graceful fallback.

### Manual step
- **Upload the 10 files from `webp-upload/mission_{N}.webp`** into Supabase Dashboard → Storage → bucket `images` → folder `mission_banner/` (drag them in; names match the existing JPGs). Until then the app keeps serving the JPG fallback automatically.

### Added
- **Content Security Policy**: strict `Content-Security-Policy` meta in `index.html` (default-src 'self'; scripts/inline styles allowed, external scripts blocked; connect-src limited to the Supabase origin; fonts only from Google Fonts; frame-src/object-src 'none'). Lightweight protection against script/URL injection while keeping the inline-handler SPA working.
- **WebP images**: `npm run optimize:images` (`scripts/optimize-images.mjs`, powered by `sharp`) converts the 10 mission-banner fallbacks into `public/img/mission{N}-banner.webp` (~58% smaller: 188–264KB → 67–109KB). `shiftBannerUrl()` now prefers `.webp`; the two banner `<img>` tags fall back to `.JPG` via `bannerOnerror()` in older browsers.
- **SEO for the SPA**: a `<noscript>` block with the site description + the 10 mission titles is now in the static HTML, so crawlers/bots without JS still index meaningful content.

### Changed
- **Performance**: removed the unused `public/bg.png` (10.7MB) — it was referenced only by `public/sw.js` precache and never displayed (the background is the CSS `--bg` color). Dropped from the Service Worker precache (bumped to `kanikuly-v2`).
- **Accessibility — heading hierarchy**: the app now has exactly one `<h1>` per view — the «Каникулы с ONE!» brand (auth screen) plus an sr-only `<h1>` in the app shell; all 8 page headers + DISC hero in `index.html` and 7 in `js/app.js` were demoted to `<h2>` (CSS selectors updated to keep the same look). No more 8+ competing H1s.
- **Accessibility — contrast**: muted text tokens raised `--muted` 0.55 → 0.65 and `--muted2` 0.30 → 0.45, lifting small `var(--muted)` labels above the AA 4.5:1 threshold on the `#1B2838` background.

### Fixed
- **Avatar upload session staleness**: `uploadStudentAvatar()` now calls `ensureAuthToken()` before the request — it re-validates the session (`authGetUser`) and falls back to `authRefreshToken()` if the stored access token expired (Supabase access tokens live ~1h; the app previously only refreshed at startup, so a long-lived tab uploaded with the anon key → RLS 403 "new row violates row-level security policy"). Also added `removeOldAvatar()` to delete a previous file when the extension changes (e.g. `.png` → `.jpg`), guarded by a new `authenticated_avatar_delete` storage policy.
- **Clearer upload errors**: the toast now detects RLS/401 responses and tells the user "Сессия истекла — выйдите и войдите заново" instead of the raw storage message.

### Migration
- **Re-run `migrations/018_avatar_upload.sql`** in the Supabase SQL Editor once (idempotent) to add the `authenticated_avatar_delete` policy (DELETE older `avatars/*` when the file extension changes). Verified: `authenticated`-role upload works — a live test with a real signed-in token returned 200.

## [3.7.0] - 2026-09-07

### Added
- **Role separation (UX)**: player (`role=player`) now hides the admin sections **Дашборд**, **Оценка** and **Участники** from both the sidebar and mobile bottom bar (`applyRoleRestrictions`), and a new guard in `navigateTo()` redirects non-admins away from `students` / `assessments` / `dashboard` even when opened via `#hash` / direct URL. Admins keep full access.
- **Unified export center**: a `📤` button in the topbar opens a single dropdown («Экспорт и печать») via `toggleExportCenter()`, centralizing the previously scattered print/PDF actions — «Печать текущей страницы» always, plus contextual «Игровой репорт участника» on the player profile. Existing buttons still work.
- **Avatar upload via file**: `uploadStudentAvatar()` + `onAvatarFilePicked()` upload a photo to Supabase Storage (`images/avatars/{studentId}.{ext}`) and backfill `students.avatar_url`; a 🖼️ button on the player profile avatar opens a file picker. Requires `migrations/018_avatar_upload.sql` (storage write policy for `authenticated`, folder `avatars/`) to be applied in the Supabase dashboard.

### Changed
- **Named squads**: new config-driven `SQUAD_NAMES` in `js/config.js` + `squadName()` helper replace bare «Команда N» across selects, filters, leaderboard, dashboard and reports. Default names: Титаны, Кометa, Лисы, Соколы, Драконы, Пингвины, Рыси, Фениксы, Волки, Орлы. Static selects and the dashboard squad filter-pills are now populated dynamically via `populateSquadControls()`, so renaming only touches the `SQUAD_NAMES` array.
- **Empty states**: bare «—»/«0%» placeholders made legible — a participant with no observations now shows «нет занятий» instead of a blank-looking 0% bar, and a student not in any squad shows «Не в командах» instead of «—».

## [3.6.2] - 2026-09-04

### Fixed
- **Shift banner images missing after Vite migration**: `img/` (mission banner JPGs + `og-card.png`) were left in the repo root, so Vite did not copy them into `dist/` and they 404'd on GitHub Pages (banners relied on `public/` copying). Moved `img/` → `public/img/` (tracked via `git mv`); Vite now copies them into `dist/img/`, restoring `img/mission{N}-banner.JPG` references used by the SPA (and OG/twitter image URLs).
- **Optional: move banners to Supabase Storage** (`migrations/017_shift_banners_supabase.sql`): documented workflow to upload banners into the `images` Storage bucket under the `mission_banner/` folder (`mission_1.JPG`..`mission_10.JPG`, filename number = `shift_id`) and backfill `content_shifts.banner_url` → `.../public/images/mission_banner/mission_{shift_id}.JPG`. `shiftBannerUrl()` already prefers `banner_url` with `public/img/*` as fallback, so no code change needed. Static files retained as fallback.

### Changed
- **SEO/meta fix in `index.html`**: `og:image`/`twitter:image` switched from the portrait mission banner (720×1280) to the horizontal `img/og-card.png` (1200×630), matching `landing.html` — correct landscape preview for social/messengers. `meta description` reworded from "летние каникулы" → "школьные каникулы" (dates are Oct–Feb, so "summer" contradicted the schedule).

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
