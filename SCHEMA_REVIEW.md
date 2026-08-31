# SCHEMA_REVIEW.md — Ревизия схемы БД «Каникулы с ONE!»

> Этот документ — ревизия схемы Supabase (PostgreSQL). Исходная схема дана «для контекста»
> (не для выполнения). Ниже — найденные проблемы, согласованные с реальными миграциями
> (`migrations/001–008`) и фактическим использованием колонок в `js/app.js`, а затем —
> **исправленная версия схемы** (цельная, нормализованная, с применёнными фиксами).

---

## 1. Найденные проблемы

### 1.1. Отсутствуют UNIQUE-ограничения на бизнес-ключи (главный риск)

Исходная схема не содержит ограничений, которые реально создают миграции. Без них возможна
**дублирующая запись данных** с двойным начислением очков/валюты.

| Таблица | Ограничение | Где создаётся | Зачем |
|---------|-------------|---------------|-------|
| `participations` | `UNIQUE (student_id, shift_id)` | `migrations/007` | Участник не должен быть в одной миссии дважды (иначе конфликт команд/отрядов). |
| `completions` | `UNIQUE (student_id, shift_id, direction_idx, mission_idx)` | `migrations/001` | Паттерн «replace» в приложении (delete+insert). Без уника — дубли строк → двойной XP/НЕО-коины. |
| `content_missions` | `UNIQUE (shift_id, mission_name)` — **нет нигде** | — (предлагается) | Дубли миссий внутри смены ломают маппинг `shift.directions[...].missions` в коде. |

**Важно:** две первые уника уже есть в реальной БД через миграции, но **отсутствуют в исходной
«контекстной» схеме** — значит контекстная схема не отражает реальность и ей нельзя доверять.

### 1.2. Разные словари редкости в разных таблицах (хрупко)

Один и тот же концепт «редкость» хранится в **двух разных словарях**:

- `content_inventory_items.rarity` → **англ. ключи**: `common | rare | legendary`
- `content_badge_definitions.rarity` → **англ. ключи**: `common | rare | epic | legendary`
- `cards.rarity` → **рус. строки для отображения**: `Обычный | Редкий | Эпический | Легендарный`

Код обрабатывает их по-разному: для баджей/инвентаря — `rarityLabel()` (переводит англ→рус),
для карт — `CARD_RARITY` (ключ уже русский). Это работает, но легко сломается при добавлении
новой логики XP (приоритет редкости) или фильтров.

**Рекомендация:** хранить **машинный ключ** (`common|rare|epic|legendary`) везде, метку для
отображения брать в коде. В картах это уже так (значения в БД — русские строки), но в
`content_*` — англ. Сводим к одному.

### 1.3. `content_shifts.currency` (на смену) vs `completions.currency/currency_name` (на задание)

Редкость/валюта задвоена: `content_shifts.currency` задаёт валюту смены, но приложение
считывает валюту из `completions.currency` и `completions.currency_name` (js/app.js:2797, 3290-3291).
Исходная схема хранит `currency` в `content_shifts`. Это не баг, но стоит зафиксировать источник
истины — предлагаем оставить `completions.currency*` как фактический источник, а `content_shifts.currency`
считать подсказкой/дефолтом для новых строк.

### 1.4. Легаси-колонки `students.shift` и `students.squad`

После введения таблицы `participations` источником истины для «участник ↔ миссия ↔ команда» стали
`participations`. Однако код **всё ещё читает** `students.shift`/`students.squad` как fallback
(js/app.js:96-97, 107, 114, 128). Поэтому колонки **нельзя удалять** — их удаление сломает fallback.
Помечаем как `LEGACY` (план: выпилить после полного перехода на `participations`).

### 1.5. Слабые FK/типы на ключевых связях

- `completions.shift_id`, `completions.direction_idx`, `observations.day/track`, `badges.track` —
  без `CHECK`/FK к `content_*`. Для демо-проекта приемлемо, но `cards.shift`/`cards.mission`
  логически ссылаются на `content_shifts.shift_id` (FK нет).
- `participations.student_id` — в реальной миграции `ON DELETE CASCADE`, в контекстной схеме нет.

---

## 2. Исправленная схема (revised)

> Цельная версия. Исправления выделены комментарием `-- FIX:`.
> `id`-последовательности опущены для читаемости (в реальной БД — IDENTITY/SERIAL).

```sql
-- ═══════════════════════════════════════════════════════════════════
--  REVISED SCHEMA — Каникулы с ONE!  (normalized + integrity fixes)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.content_shifts (
  shift_id    INT  PRIMARY KEY,              -- номер миссии 1..10
  currency    TEXT,                          -- FIX: подсказка/дефолт валюты (источник истины — completions.currency)
  title       TEXT,
  subtitle    TEXT,
  tags        JSONB,
  legend      TEXT,
  gamification TEXT,
  english     TEXT,
  sport       TEXT,
  skills      TEXT,
  product     TEXT,
  directions  JSONB,
  banner_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.content_missions (
  id               INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  shift_id         INT  NOT NULL,
  direction_name   TEXT NOT NULL,
  mission_name     TEXT NOT NULL,
  description      TEXT,
  key_steps        TEXT,
  age_7_9          TEXT,
  age_10_12        TEXT,
  english_phrases  TEXT,
  english_vocabulary TEXT,
  english_format   TEXT,
  materials        TEXT,
  criteria_0_3     TEXT,
  criteria_4_6     TEXT,
  criteria_7_8     TEXT,
  criteria_9_10    TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  -- FIX: защита от дублей миссий внутри смены
  CONSTRAINT content_missions_pkey PRIMARY KEY (id),
  CONSTRAINT uq_content_missions_shift_name UNIQUE (shift_id, mission_name),
  CONSTRAINT fk_content_missions_shift FOREIGN KEY (shift_id)
    REFERENCES public.content_shifts(shift_id) ON DELETE CASCADE
);

CREATE TABLE public.content_competencies (
  comp_id    TEXT PRIMARY KEY,
  name       TEXT,
  icon       TEXT,
  color      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.content_badge_definitions (
  badge_id       TEXT PRIMARY KEY,
  name           TEXT,
  icon           TEXT,
  shift_id       INT,
  direction_name TEXT,
  mission_name   TEXT,
  condition      TEXT,
  rarity         TEXT,      -- FIX: единый ключ: common|rare|epic|legendary
  desc           TEXT,
  image_url      TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.content_disc_config (
  config_key   TEXT PRIMARY KEY,
  config_value JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.students (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  nickname   TEXT NOT NULL CHECK (length(btrim(nickname)) > 0),
  age        INT,
  gender     TEXT,
  grade      INT,
  squad      INT,            -- LEGACY: см. participations
  shift      INT,            -- LEGACY: см. participations
  campus     TEXT,
  notes      TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.observations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  day          INT,
  track        TEXT,
  independence INT,          -- FIX: добавить CHECK (0..5), если диапазон фиксирован
  quality      INT,          -- FIX: добавить CHECK (0..5)
  initiative   BOOLEAN DEFAULT false,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  badge_id   TEXT,
  name       TEXT,
  icon       TEXT,
  track      TEXT,
  rarity     TEXT,          -- FIX: единый ключ: common|rare|epic|legendary
  earned     BOOLEAN DEFAULT true,
  earned_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.completions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  shift_id       INT,
  direction_idx  INT,
  direction_name TEXT,
  mission_idx    INT,
  mission_name   TEXT,
  score          INT,
  xp             INT,
  currency       INT,
  currency_name  TEXT,
  skills         JSONB,
  professions    JSONB,
  future_skills  JSONB,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  -- FIX: гарантия «один студент×задание = одна строка» (паттерн replace в коде)
  CONSTRAINT uq_completions_student_shift_dir_mis
    UNIQUE (student_id, shift_id, direction_idx, mission_idx)
);

CREATE TABLE public.content_inventory_items (
  id         TEXT PRIMARY KEY,
  shift_id   INT NOT NULL,
  icon       TEXT,
  name       TEXT NOT NULL,
  rarity     TEXT NOT NULL DEFAULT 'common',  -- FIX: единый ключ common|rare|legendary
  bonus      TEXT,
  image_url  TEXT,
  -- FIX: внешний ключ на смену (целостность)
  CONSTRAINT fk_inventory_shift FOREIGN KEY (shift_id)
    REFERENCES public.content_shifts(shift_id) ON DELETE CASCADE
);

CREATE TABLE public.participations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  shift_id   INT  NOT NULL,
  squad      INT  NOT NULL CHECK (squad BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  -- FIX: один участник — одна запись в миссии (нельзя дублировать команду)
  CONSTRAINT uq_participations_student_shift UNIQUE (student_id, shift_id)
);

CREATE TABLE public.cards (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  num        INT  NOT NULL UNIQUE,   -- 1..84
  section    TEXT NOT NULL CHECK (section IN ('inventory','relic','badge','boss','shop','mystery')),
  icon       TEXT NOT NULL,
  name       TEXT NOT NULL,
  rarity     TEXT NOT NULL DEFAULT 'Обычный',  -- FIX: см. 1.2 — свести к ключу или пометить как display
  bonus      TEXT,
  mission    INT,
  shift      INT,
  week       INT,
  hp         INT,
  reward     TEXT,
  price      TEXT,
  item_type  TEXT,
  condition  TEXT,
  chance     TEXT,
  value_type TEXT,
  value      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы для типовых запросов (SELECT по студенту/миссии)
CREATE INDEX IF NOT EXISTS idx_participations_student ON public.participations(student_id);
CREATE INDEX IF NOT EXISTS idx_participations_shift   ON public.participations(shift_id);
CREATE INDEX IF NOT EXISTS idx_completions_student    ON public.completions(student_id);
CREATE INDEX IF NOT EXISTS idx_completions_created    ON public.completions(created_at);
CREATE INDEX IF NOT EXISTS idx_obs_student_day        ON public.observations(student_id, day);
CREATE INDEX IF NOT EXISTS idx_badges_student_earned  ON public.badges(student_id) WHERE earned;
```

---

## 3. Резюме изменений (что и почему)

| # | Изменение | Тип | Риск удаления |
|---|-----------|-----|---------------|
| 1 | `UNIQUE (student_id, shift_id)` на `participations` | FIX | нет |
| 2 | `UNIQUE (student_id, shift_id, direction_idx, mission_idx)` на `completions` | FIX | нет |
| 3 | `UNIQUE (shift_id, mission_name)` на `content_missions` | FIX | нет |
| 4 | `content_missions.shift_id` → FK на `content_shifts` | FIX | нет |
| 5 | `content_inventory_items.shift_id` → FK на `content_shifts` | FIX | нет |
| 6 | `students` → `nickname NOT NULL + CHECK` | уже есть (миграция 003) | нет |
| 7 | `students.shift/squad` помечены LEGACY | не удалять | **high — код использует fallback** |
| 8 | Единый словарь редкости (адаптация кода, не только схемы) | рефакторинг | средний — чисто косметика |

---

## 4. Что требует отдельного решения (не только SQL)

1. **Унификация редкости** — сейчас `cards.rarity` = рус. (display), `content_*` = англ. (key).
   Правильно: в БД хранить **машинный ключ**, метку рисовать на фронте. Это изменение + SQL (UPDATE
   значений) + код → делать отдельной задачей, а не молча менять схему.
2. **Выпил LEGACY `students.shift/squad`** — потребует убрать fallback в `js/app.js` (5+ мест) и
   перенести данные в `participations`. Отдельная задача.
3. **CHECK-диапазоны** на `observations.independence/quality` и `completions.score` — нужно
   подтвердить реально допустимые значения в логике оценки, прежде чем добавлять `CHECK`.
