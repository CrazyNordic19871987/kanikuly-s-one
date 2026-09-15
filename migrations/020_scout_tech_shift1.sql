-- ═══════════════════════════════════════════════════════════════════
--  MIGRATION 020: Scout Tech — replace «Кибер-Атлеты» in Shift 1
--  Run in Supabase Dashboard SQL Editor.
-- ═══════════════════════════════════════════════════════════════════

-- 1. content_shifts — update Shift 1
UPDATE public.content_shifts
SET
  title      = 'Scout Tech: Полевые Инженеры',
  subtitle   = 'SURVIVAL & DIY TECH',
  tags       = '["Спорт","IT","Биотех","Предпринимательство"]'::jsonb,
  legend     = 'Ребята — юные рейнджеры-исследователи в полевом лагере Scout Tech. Они учатся выживать и создавать гаджеты своими руками: от магнитного компаса до спасательного маяка на micro:bit. Финал — Большая Экспедиция и Demo Day, где каждый ребёнок защищает свой гаджет перед «комиссией лагеря».',
  gamification = 'Каждое задание — проверка на рейнджера. Оценивается от 1 до 5: от «Рекрут» до «Мастер Выживания». Лучшие рейнджеры получают звания и реликвии.',
  english    = 'Окружение на английском: Major, Expedition, SOS, Compass, Shelter, Signal, Scavenger Hunt, Field Journal. Фразы дня: "Roger that!", "Mayday!", "Coordinates confirmed".',
  sport      = 'Физическая подготовка в формате выживания: полосы препятствий, стрельба из лука, лазертаг-тактика, верёвочные узлы и ориентирование.',
  skills     = 'Навыки: навигация, ориентирование, работа с компасом, стрельба из лука, первая помощь, программирование на micro:bit, черчение, речь и защита проекта.',
  product    = 'Каждый участник собирает свой гаджет (компас, сигнальный фонарь или спасательное устройство), записывает технический паспорт и защищает проект на Demo Day перед жюри.',
  currency   = 'Единицы снаряжения',
  directions = '[
    {
      "name": "🏅 Спорт",
      "missions": [
        {"name": "Полоса препятствий Ranger", "desc": "Преодоление препятствий: канаты, тоннели, баланс — как настоящие рейнджеры.", "skills": ["persistence","adaptability"]},
        {"name": "Стрельба из лука", "desc": "Мягкий лук по мишеням — точность и концентрация.", "skills": ["persistence","self_organization"]},
        {"name": "Лазертаг «Захват флага»", "desc": "Командная тактическая игра: захват территории и защита базы.", "skills": ["cooperation","initiative"]},
        {"name": "Спортивное ориентирование", "desc": "Бег по точкам с компасом и картой территории лагеря.", "skills": ["adaptability","problem_solving"]}
      ]
    },
    {
      "name": "💻 IT & Gadgets",
      "missions": [
        {"name": "Сборка компаса из иглы", "desc": "Намагниченная игла + пробка + стакан воды = рабочий компас. Учимся определять стороны света.", "skills": ["creativity","problem_solving"]},
        {"name": "Сигнальный фонарь", "desc": "Сборка LED-устройства для подачи сигналов SOS морзянкой.", "skills": ["problem_solving","learning_ability"]},
        {"name": "Спасательный гаджет на micro:bit", "desc": "Датчик температуры + SOS-морзянка на плате micro:bit.", "skills": ["creativity","learning_ability"]},
        {"name": "GPS-квест с QR-точками", "desc": "Ориентирование по координатам с QR-метками на территории лагеря.", "skills": ["problem_solving","curiosity"]}
      ]
    },
    {
      "name": "🧬 Биотех",
      "missions": [
        {"name": "Полевой дневник исследователя", "desc": "Наблюдение за природой: зарисовки растений, определение видов, записи в полевом журнале.", "skills": ["curiosity","learning_ability"]},
        {"name": "Биометрия исследователя", "desc": "Измерение пульса и реакции до и после физической нагрузки — как настоящие учёные в поле.", "skills": ["curiosity","critical_thinking"]},
        {"name": "Очистка воды", "desc": "Сборка простейшего фильтра из подручных материалов для получения чистой воды.", "skills": ["problem_solving","adaptability"]}
      ]
    },
    {
      "name": "📊 Предпринимательство",
      "missions": [
        {"name": "Патентное бюро", "desc": "Оформление и защита идеи своего гаджета перед «комиссией лагеря».", "skills": ["communication","initiative"]},
        {"name": "Юнит-экономика снаряжения", "desc": "Расчёт стоимости оборудования экспедиции и управления бюджетом.", "skills": ["critical_thinking","problem_solving"]},
        {"name": "Demo Day: питч гаджета", "desc": "Финальная презентация изобретения родителям и жюри — защита проекта.", "skills": ["communication","social_position"]}
      ]
    }
  ]'::jsonb
WHERE shift_id = 1;

-- 2. content_inventory_items — replace Shift 1 items
DELETE FROM public.content_inventory_items WHERE shift_id = 1;
INSERT INTO public.content_inventory_items (id, shift_id, icon, name, rarity, bonus) VALUES
('scout_compass',   1, '🧭', 'Полевой компас',        'common',  '+5% к навигации'),
('scout_beacon',    1, '🔦', 'Сигнальный фонарь',     'common',  '+5% к выживанию'),
('scout_firstaid',  1, '🩹', 'Полевая аптечка',        'common',  '+5% к биотеху'),
('scout_repair',    1, '🔧', 'Ремкомплект гаджета',    'rare',    '+10% к IT'),
('scout_broadcaster', 1, '📡', 'Спасательный маяк',    'rare',    '+10% к координации');

-- 3. cards — update inventory cards 1-5 and relic card 51 for Shift 1
UPDATE public.cards SET icon = '🧭', name = 'Полевой компас',       rarity = 'Обычный',  bonus = '+5% к навигации'   WHERE num = 1;
UPDATE public.cards SET icon = '🔦', name = 'Сигнальный фонарь',    rarity = 'Обычный',  bonus = '+5% к выживанию'   WHERE num = 2;
UPDATE public.cards SET icon = '🩹', name = 'Полевая аптечка',      rarity = 'Обычный',  bonus = '+5% к биотеху'     WHERE num = 3;
UPDATE public.cards SET icon = '🔧', name = 'Ремкомплект гаджета',  rarity = 'Редкий',   bonus = '+10% к IT'         WHERE num = 4;
UPDATE public.cards SET icon = '📡', name = 'Спасательный маяк',    rarity = 'Редкий',   bonus = '+10% к координации' WHERE num = 5;
UPDATE public.cards SET icon = '🧭', name = 'Компас первопроходца', rarity = 'Эпический', bonus = '+10 XP ко всем заданиям' WHERE num = 51;

-- 4. content_missions — delete old Shift 1 missions (will be replaced by content_shifts.directions fallback)
DELETE FROM public.content_missions WHERE shift_id = 1;

-- ═══════════════════════════════════════════════════════════════════
-- Done. This migration is idempotent for the UPDATE statements.
-- Note: banner_url for Shift 1 is kept unchanged (img/mission1-banner.JPG).
-- ═══════════════════════════════════════════════════════════════════
