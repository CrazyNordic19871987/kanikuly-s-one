# План работ по устранению недочётов «Каникулы с ONE!»

> Статус: утверждён 2026-09-07. Исполнение: **Фазы A+B ✅ завершены (2026-09-08)**, следующий шаг — Фаза C.
> Репозиторий: `kanikuly-s-one` · Последняя версия: 3.8.3 (коммит `e523146`).

## Принципы

- **Безопасность и персональные данные — приоритет №1** (детский лагерь, ПДн, 152-ФЗ).
- Рефакторинг = механический, 1-в-1 по поведению; каждый шаг = отдельный коммит с lint/test/build.
- Верификация каждого шага: `npm run lint` → `npm test` → `npm run build` → пуш → `webfetch` live.
- Никаких необратимых удалений: старый инлайн-CSS и старые файлы — в `backup/` или git-истории.

---

## Фаза A — Безопасность и персональные данные (критично, первым)

### A1. Аудит фактического состояния RLS в live-базе
Запрос в Supabase SQL Editor:
```sql
SELECT schemaname, tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public' OR schemaname = 'storage'
ORDER BY tablename, policyname;
```
Сверить с репозиторием (migrations/001–018). Вдруг часть политик уже поправлена руками — это меняет объём A2.

### A2. Миграция `migrations/019_security_hardening.sql` — ✅ применена в Dashboard (2026-09-08)
1. **Закрыть эскалацию роли** — триггер `prevent_admin_escalation()` на `profiles`: `role='admin'` только при `is_admin()` (INSERT и UPDATE). Живо подтверждено: self-signup мог INSERT `role:'admin'` и стать полным админом.
2. **Закрыть rename-claim** — триггер `prevent_username_takeover()`: не-админ не может менять `profiles.username` (username = логин = email@kanikuly.auth; смена нужна только для «переименоваться в чужого ребёнка»). Админ может.
3. **Сужение широких SELECT-политик (013)**: выброшены `auth_select_students/observations/badges/completions/participations` (`auth.role()='authenticated'` = весь банк детей). Вместо них — «только свои через `user_id=auth.uid()` + `is_admin()`», плюс `own_select_claimable` (виден только unclaimed ребёнок со своим username — сохраняет авто-claim из `selfLinkStudent`).
4. **Storage-аватары (018)**: политики INSERT/UPDATE/DELETE теперь через `can_manage_avatar(name)` (security definer) — файл `avatars/{student_id}.{ext}` только для владельца ребёнка или админа. Публичное чтение бакета сохранено.
5. **`AUTH_EMAIL_DOMAIN`** — дубль удалён из `js/config.js` (единственный источник — инлайн-auth в `index.html`).
6. VERIFY-блок в конце миграции (pg_policies + тест эскалации).

> **Применение**: Dashboard → SQL Editor → выполнить `019_security_hardening.sql`, затем удалить audit-пользователей: `DELETE FROM auth.users WHERE email LIKE 'audit%@kanikuly.auth';`

### A3. Настройки Auth в Supabase Dashboard + admin-создание учёток (вручную + код)
- ✅ UI: вкладка «Регистрация» скрыта в `index.html` (только «Вход»), хинт «Аккаунты создаёт администратор».
- **Закрыть публичную регистрацию** (ручно): Dashboard → `Authentication → Providers → Email → Disable new signups`. Вход — только для существующих аккаунтов.
- **Admin-создание пользователей** (ручно): Dashboard → `Authentication → Users → Add user` (`<login>@kanikuly.auth` + пароль); профиль создастся сам при первом входе (`authGetProfile`). Альтернатива позже — admin-механика `auth.admin.createUser` в админке (вынесено в Фазу E/F).
- **Сброс пароля** — вручную админом: Dashboard → `Authentication → Users → (пользователь) → Reset password`. Настоящий SMTP — вместе с покупкой домена позже.
- Зафиксировано: фальшивый домен `.auth` → восстановление пароля по email не работает; письма не ходят.

### A4. Ре-верификация — ✅ пройдена (2026-09-08)
- Живой PoC (до фикса) — оба критичных дыра подтверждены: self-signup прочитал всех детей (ФИО/возраст/пол/класс/notes) и INSERT-нул себе `role='admin'` с полным админ-доступом (чтение всех profiles). Audit-аккаунт: `audit290633@kanikuly.auth` (удалён).
- После применения 019 (live REST): регистрация закрыта (`signup → 422`); audit-пользователь удалён (вход → 400); INSERT `role:'admin'` → 400 `P0001`; UPDATE `role→admin` → 400; смена `username` → 400; чтение students/observations/completions игроком → 0 строк; чтение profiles → только своя (`verif1/player`). Обычный INSERT своего profile (`role:'player'`) — успешен.
- Временный тест-юзер `verif1@kanikuly.auth` — удалить после ре-верификации (Dashboard → Users).
- **Публикация кода (миграция + config.js + index.html)** — коммит `6bdb3fc` (`fix(security)`, v3.8.2), lint/test/build, пуш, деплой live (config.js?v=11).

---

## Фаза B — Гигиена и дрифт документов — ✅ завершена (2026-09-08)

1. ✅ **AGENTS.md — палитра**: обновлена под фактический `:root` (`--orange:#3B82F6` — синий, `--green:#FBBF24` — жёлтый, `--sky:#93C5FD`, `--purple:#8B5CF6`, glass/border-токены, `--r/--r-lg`, `--muted/--muted2`). Добавлено примечание: переименование в `--accent`/`--gold` — в Фазе C.
2. ✅ **README.md**: badge `version-3.0.0` → `3.8.2`; миграции `001–008` → `001–019` (+ новый диапазон row для 009–019); «RLS публичного доступа» → актуальный статус (PII закрыт, регистрация закрыта); js/-структура дополнена logic/pdf/progress; цветовая схема исправлена (`#F97316` → фактические токены).
3. ✅ **SEO**: `<link rel="canonical">`, `og:url` без `#shifts`, `public/sitemap.xml`, `public/robots.txt` со ссылкой на sitemap.
4. ✅ **`noscript`**: «Каждая смена длится 5 дней» → «Смены длятся от 5 до 10 дней» (по `SHIFT_DATES`: 1–4 смены — 5 дней, 5–10 — 10 дней).
5. ✅ **`player_progress` cleanup** (js/progress.js): `snapshotStudentProgress` теперь сохраняет только срез своего `student_id` (раньше — полная карта всех учеников в ячейку каждого); cache-bust progress.js `?v=1` → `?v=2`.
6. ✅ **Родительская папка**: `compare.js/dump.js/inspect.js/result.csv` + `package.json`(xlsx) — скрипты учёта посещения/брони (чужой проект, не репо); `one-profile-v2-README.md`, `student_psychology_feedback_generator-README.md` — README соседних проектов; `kanikuly-s-one-README.md` — устаревшая копия README репо (вне git) — ничего не удалялось, репо не затронут.

---

## Фаза C — CSS-рефакторинг (механический сплит, 1-в-1)

1. Инлайн `<style>` в `index.html` (≈104KB, ~L31–1650) разбить без изменения правил:
   - `css/base.css` — `:root`, фон, loader, toast, helpers;
   - `css/layout.css` — sidebar, мобильное меню, topbar, page-container, auth-screen;
   - `css/students.css` — форма регистрации/быстрый просмотр (самый большой блок);
   - `css/shifts.css` — миссии, shift-detail, дашборд;
   - `css/profile.css` — профиль игрока, DISC, инвентарь, рекомендации, glassy-панели;
   - `css/print.css` — блок `@media print` (критично: сохранить отчёты);
   - `css/responsive.css` — все `@media(max-width:...)` вместе.
2. Подключить через `<link rel="stylesheet">` в том же порядке. Текущий `<style>` сохранить в `backup/`.
3. Опционально (низкий риск): 86 инлайн `style=""` → классы точечно, где паттерн повторяется.
4. Верификация: build → деплой → `webfetch` live → постраничный визуальный проход + печать отчёта (`window.print()`).

---

## Фаза D — Доступность и качество UI

1. **Клавиатура**: 9 элементов `<div onclick>` (app.js: логи, карточки студентов/смен, shop-item, branch-card, assess-direction-header) → `<button role="button">` или добавление `tabindex`, `role`, `onkeydown` (Enter/Space).
2. **Touch targets**: проверить/поднять кнопки меню/лейблы до ≥44px.
3. **Контраст/фокус**: уже улучшено (`--muted` 0.65, `:focus-visible`); пройтись по остальным текстам малого кегля (`--muted2` на placeholder — допустимо, но проверить `.auth-field input::placeholder`, `font-size:0.68rem` ссылки).
4. **Шрифты**: `preload` Google Fonts; проверить необходимость 3 семейств (Space Grotesk / Orbitron / JetBrains Mono) — возможно сократить до 2.
5. **CI-детекция**: добавить Lighthouse CI (bundle jest) или step с axe-core на деплое. От внешних непроверенных инструментов («impeccable») воздержаться.

---

## Фаза E — JS-рефакторинг (отдельный тикет, не сейчас)

1. Разложить `js/app.js` (217KB / ~4326 строк) по существующим `// ====` секциям:
   - `js/app.js` — ядро: init, auth/navigation, shell, экспорт-центр (<50KB);
   - `js/rpg.js` — XP/level/streak/currency/shop/badges/boss/mystery/legacy;
   - `js/views-students.js`, `js/views-shifts.js`, `js/views-profile.js`, `js/views-dashboard.js`, `js/views-assessments.js`.
2. **Вариант исполнения — (A) plain-скрипты**: физическое разбиение на несколько `<script>` в нужном порядке в `index.html` (минимальный риск для деплоя; Vite копирует как есть). ES-модули (B) — не переходим.
3. Каждый файл — отдельный коммит; после каждого: lint/test/build + ручной проход вкладок.
4. Ожидаемый бонус: легче писать vitest на чистую логику рендера.

---

## Фаза F — Процесс/CI (в конце)

1. Обновить `AGENTS.md` под новую структуру (`css/`, модули JS, запрет инлайн-стилей, правило `?v=` — уже есть).
2. Добавить шаг Lighthouse/axe в `.github/workflows/deploy.yml`.
3. Снапшот-тесты рендеров (опционально).
4. Сверить `README`/`CHANGELOG`/бейджи с актуальной версией; очистить `webp-upload/`.

---

## Порядок и зависимости

```
A (безопасность) → B (гигиена) → C (CSS) → D (a11y) → E (JS, отдельно) → F (процесс)
```
- C блокирует D? Не обязательно; но сплит CSS раньше детекции качества удобнее.
- E — самый рискованный, делать отдельным тикетом в конце.
- Любая фаза может быть остановлена без срыва остальных.

## Решения (утверждены владельцем 2026-09-07)
1. **Регистрация** → закрыть публичный signup. Вход — только для существующих аккаунтов; учётки создаёт админ:
   - Dashboard: `Authentication → Providers → Email → Disable new signups` (или allow-list на настройке);
   - admin-механика создания пользователя: `auth.admin.createUser` + создание профиля в админском контексте (обход триггера `prevent_admin_escalation` не требуется — профиль создаётся с ролью `player`).
2. **Сброс паролей** → сейчас вручную админом (Supabase `Authentication → Users → ... → reset password`). Настоящий SMTP — одним пакетом с будущей покупкой домена (self-service для родителей).
3. **`--orange`/`--green`** → переименовать в `--accent`/`--gold` с алиасами (`--orange: var(--accent)`, `--green: var(--gold)`) **в рамках Фазы C** (один проход со сплитом CSS). Сейчас — комментарий в `:root` + AGENTS.md.