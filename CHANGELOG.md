# Changelog

All notable changes to this project will be documented in this file.

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
