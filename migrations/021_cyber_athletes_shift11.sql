-- ═══════════════════════════════════════════════════════════════════
--  MIGRATION 021: Add «Кибер-Атлеты» back as Shift 11
--  Scout Tech replaced Кибер-Атлеты in Shift 1 (migration 020).
--  This migration restores Кибер-Атлеты as a NEW Shift 11.
--  Run in Supabase Dashboard SQL Editor (after migration 020).
-- ═══════════════════════════════════════════════════════════════════

-- 1. content_shifts — insert Shift 11 (Кибер-Атлеты: Хроники Будущего)
INSERT INTO public.content_shifts (shift_id, title, subtitle, legend, tags, gamification, english, sport, skills, product, currency, directions, banner_url)
VALUES (
  11,
  'Кибер-Атлеты: Хроники Будущего',
  'PHYGITAL & SCI-FI',
  'Участники — «Агенты Будущего» в секретной академии. Их задача — спасти цифровую вселенную, развивая физические и интеллектуальные способности. Каждый день — новая миссия, каждая победа — очки опыта.',
  '["Спорт","IT","Биотех","Предпринимательство"]'::jsonb,
  'Нейро-коины — внутренняя валюта смены. Очки за каждое задание, босс недели «Кибер-Дракон», звания и реликвии.',
  'Окружение на английском: Future, Mission, Sensor, Data, Pulse, Pitch, Investor. Фразы дня: "Mission complete!", "I earned 5 coins!", "Our gadget measures...".',
  'Физическая подготовка в формате «Агентов Будущего»: нейрофитнес на Blazepod, балансборды, лазертаг, Archery Tag и мечевой бой.',
  'Навыки: реакция, координация, тактика, программирование на micro:bit, сборка датчиков, анализ данных, биометрия, презентация и финансовая грамотность.',
  'Каждый участник собирает датчик-гаджет, ведёт данные и защищает проект перед «инвестиционным комитетом» на питче.',
  'Нейро-коины',
  '[
    {
      "name": "🏅 Спорт",
      "missions": [
        {"name": "Нейрофитнес на Blazepod", "desc": "Тренировка реакции и координации с LED-панелями.", "skills": ["persistence","adaptability"]},
        {"name": "Балансборды и стабильность", "desc": "Работа на нестабильных платформах для укрепления кора.", "skills": ["persistence","self_organization"]},
        {"name": "Лазертаг-миссия", "desc": "Командная тактическая игра в условиях «цифровой вселенной».", "skills": ["cooperation","problem_solving"]},
        {"name": "Archery Tag", "desc": "Стрельба из лука мягкими стрелами в формате соревнования.", "skills": ["persistence","self_organization"]},
        {"name": "Мечевой бой", "desc": "Современный фехтовальный бой с безопасным инвентарём.", "skills": ["initiative","adaptability"]}
      ]
    },
    {
      "name": "💻 IT",
      "missions": [
        {"name": "Программирование на micro:bit", "desc": "Настройка сенсоров и первые шаги в коде.", "skills": ["problem_solving","learning_ability"]},
        {"name": "Сборка датчика-гаджета", "desc": "Конструирование персонального устройства из компонентов.", "skills": ["creativity","problem_solving"]},
        {"name": "Основы анализа данных", "desc": "Сбор данных с датчиков и визуализация результатов.", "skills": ["critical_thinking","learning_ability"]},
        {"name": "Эко-полис: мини-проект", "desc": "Проектирование элемента умного города с 3D-моделированием.", "skills": ["creativity","communication"]}
      ]
    },
    {
      "name": "🧬 Биотех",
      "missions": [
        {"name": "Биохакинг: пульс и реакция", "desc": "Измерение реакции и пульса до и после нагрузки.", "skills": ["curiosity","critical_thinking"]},
        {"name": "Анализ данных тела", "desc": "Сравнение биометрических показателей участников.", "skills": ["critical_thinking","problem_solving"]},
        {"name": "Эко-полис: зелёные технологии", "desc": "Проектирование экологичных решений для умного города.", "skills": ["creativity","social_position"]}
      ]
    },
    {
      "name": "📊 Предпринимательство",
      "missions": [
        {"name": "Нейро-коины: внутренняя валюта", "desc": "Заработок и управление игровой валютой через задания.", "skills": ["self_organization","problem_solving"]},
        {"name": "Питчинг гаджета", "desc": "Защита своего проекта перед «инвестиционным комитетом».", "skills": ["communication","initiative"]},
        {"name": "Юнит-экономика продукта", "desc": "Расчёт стоимости и ценности созданного устройства.", "skills": ["critical_thinking","problem_solving"]}
      ]
    }
  ]'::jsonb,
  'img/mission11-banner.webp'
)
ON CONFLICT (shift_id) DO NOTHING;

-- 2. content_inventory_items — Shift 11 items (Кибер-Атлеты)
DELETE FROM public.content_inventory_items WHERE shift_id = 11;
INSERT INTO public.content_inventory_items (id, shift_id, icon, name, rarity, bonus) VALUES
('cyber_neuropod',  11, '⚡', 'Нейро-под',     'common', '+5% к спорту'),
('cyber_blazecore', 11, '🔥', 'Blaze-ядро',    'rare',   '+10% к спорту'),
('cyber_lasergun',  11, '🔫', 'Лазер-пистолет','common', '+5% к тактике'),
('cyber_balance',   11, '⚖️', 'Балансборд',   'common', '+5% к координации'),
('cyber_chip',      11, '💾', 'Нейро-чип',     'rare',   '+10% к IT');

-- 3. cards — new inventory cards 85-89 (mission 11) and relic card 90 (shift 11)
INSERT INTO public.cards (num, section, icon, name, rarity, bonus, mission) VALUES
  (85,'inventory','⚡','Нейро-под','common','+5% к спорту',11),
  (86,'inventory','🔥','Blaze-ядро','rare','+10% к спорту',11),
  (87,'inventory','🔫','Лазер-пистолет','common','+5% к тактике',11),
  (88,'inventory','⚖️','Балансборд','common','+5% к координации',11),
  (89,'inventory','💾','Нейро-чип','rare','+10% к IT',11)
ON CONFLICT (num) DO NOTHING;

INSERT INTO public.cards (num, section, icon, name, rarity, bonus, shift) VALUES
  (90,'relic','🐉','Чешуя Дракона','epic','+10 XP ко всем заданиям',11)
ON CONFLICT (num) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- Done. This migration is idempotent (ON CONFLICT / DELETE+INSERT).
-- Note: banner_url points to img/mission11-banner.webp (already placed
-- to public/img/ so it exists on the live site).
-- ═══════════════════════════════════════════════════════════════════