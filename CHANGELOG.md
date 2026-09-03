# Changelog

All notable changes to this project will be documented in this file.

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
