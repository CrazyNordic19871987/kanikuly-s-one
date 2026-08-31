-- ═══════════════════════════════════════════════════════════════════
--  Каникулы с ONE! — КОЛЛЕКЦИЯ КАРТОЧЕК (84 шт.)
--  Одна строка = одна игровая карточка коллекции.
--  Разделы: inventory (50) / relic (10) / badge (5) / boss (4) /
--           shop (8) / mystery (7)  — всего 84.
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.cards (
  id           BIGSERIAL PRIMARY KEY,
  num          INT  NOT NULL UNIQUE,          -- номер карточки 1..84
  section      TEXT NOT NULL CHECK (section IN ('inventory','relic','badge','boss','shop','mystery')),
  icon         TEXT NOT NULL,                 -- эмодзи-иконка
  name         TEXT NOT NULL,                 -- название
  rarity       TEXT NOT NULL DEFAULT 'common',-- common/rare/epic/legendary
  bonus        TEXT,                          -- бонус/эффект (inventory, relic, shop)
  mission      INT,                           -- номер миссии (inventory 1..10)
  shift        INT,                           -- номер смены (relic 1..10)
  week         INT,                           -- неделя (boss)
  hp           INT,                           -- HP (boss)
  reward       TEXT,                          -- награда (boss)
  price        TEXT,                          -- цена (shop)
  item_type    TEXT,                          -- тип (shop: Расходник/Постоянный/Косметика)
  condition    TEXT,                          -- условие (badge)
  chance       TEXT,                          -- выпадение (mystery, напр. "40%")
  value_type   TEXT,                          -- тип значения (mystery: XP/Монеты/Предмет)
  value        TEXT,                          -- значение (mystery)
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_cards" ON public.cards;
CREATE POLICY "anon_all_cards"
  ON public.cards FOR ALL USING (true);

DROP POLICY IF EXISTS "anon_read_cards" ON public.cards;
CREATE POLICY "anon_read_cards"
  ON public.cards FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════
-- ДАННЫЕ: 84 карточки
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO public.cards (num, section, icon, name, rarity, bonus, mission) VALUES
  (1,'inventory','⚡','Нейро-под','common','+5% к спорту',1),
  (2,'inventory','🔥','Blaze-ядро','rare','+10% к спорту',1),
  (3,'inventory','🔫','Лазер-пистолет','common','+5% к тактике',1),
  (4,'inventory','⚖️','Балансборд','common','+5% к координации',1),
  (5,'inventory','💾','Нейро-чип','rare','+10% к IT',1),
  (6,'inventory','🌱','Капсула-семя','common','+5% к биотеху',2),
  (7,'inventory','🏗️','Терраформер','rare','+10% к биотеху',2),
  (8,'inventory','🛞','Ровер-разведчик','common','+5% к исследованию',2),
  (9,'inventory','🤝','Дипломатический мандат','common','+5% к дипломатии',2),
  (10,'inventory','🏕️','Колония','rare','+10% к команде',2),
  (11,'inventory','📹','Шпионская камера','common','+5% к медиа',3),
  (12,'inventory','🎭','Маскировка','rare','+10% к медиа',3),
  (13,'inventory','🔑','Декодер','common','+5% к IT',3),
  (14,'inventory','🎯','Тагер','common','+5% к спорту',3),
  (15,'inventory','📁','Досье агента','rare','+10% к аналитике',3),
  (16,'inventory','🖊️','3D-ручка','common','+5% к дизайну',4),
  (17,'inventory','🖨️','3D-принтер','rare','+10% к дизайну',4),
  (18,'inventory','📡','Датчик','common','+5% к IT',4),
  (19,'inventory','🧪','Лабораторный стакан','common','+5% к биотеху',4),
  (20,'inventory','🧬','Прототип','rare','+10% к изобретениям',4),
  (21,'inventory','🦾','Экзо-перчатка','common','+5% к спорту',5),
  (22,'inventory','⚙️','Био-ядро','rare','+10% к биотеху',5),
  (23,'inventory','⚡','Реактор','common','+5% к IT',5),
  (24,'inventory','🧤','Силовая перчатка','common','+5% к силе',5),
  (25,'inventory','🔋','Амплификатор','rare','+10% к производительности',5),
  (26,'inventory','🗺️','Городская карта','common','+5% к навигации',6),
  (27,'inventory','📡','Сигнал','rare','+10% к IT',6),
  (28,'inventory','🎤','Репортёрский микрофон','common','+5% к медиа',6),
  (29,'inventory','🎨','Спрей-маркер','common','+5% к дизайну',6),
  (30,'inventory','📐','Городской чертёж','rare','+10% к стратегии',6),
  (31,'inventory','💡','LED-модуль','common','+5% к IT',7),
  (32,'inventory','🔌','Микросхема','rare','+10% к IT',7),
  (33,'inventory','🖌️','Кисть smart-художника','common','+5% к дизайну',7),
  (34,'inventory','🧫','Био-образец','common','+5% к биотеху',7),
  (35,'inventory','⚖️','Миниатюрная модель','rare','+10% к архитектуре',7),
  (36,'inventory','🎲','Кубик историй','common','+5% к английскому',8),
  (37,'inventory','📖','Сценарный буклет','rare','+10% к английскому',8),
  (38,'inventory','🎮','Геймпад','common','+5% к IT',8),
  (39,'inventory','🎨','Палитра','common','+5% к дизайну',8),
  (40,'inventory','🎭','Мини-сцена','rare','+10% к презентациям',8),
  (41,'inventory','🏅','Спортивная медаль','common','+5% к спорту',9),
  (42,'inventory','🏆','Кубок чемпиона','rare','+15% к спорту',9),
  (43,'inventory','📣','Судейский свисток','common','+5% к лидерству',9),
  (44,'inventory','🚩','Флаг команды','common','+5% к дипломатии',9),
  (45,'inventory','🥊','Чемпионский пояс','legendary','+20% ко всем',9),
  (46,'inventory','🧭','Компас','common','+5% к навигации',10),
  (47,'inventory','🔴','Ракета','rare','+10% к спасению',10),
  (48,'inventory','📹','Экспедиционная камера','common','+5% к медиа',10),
  (49,'inventory','🔪','Сапёрный нож','common','+5% к выживанию',10),
  (50,'inventory','📡','Спасательный маяк','legendary','+20% ко всем',10)
ON CONFLICT (num) DO NOTHING;

INSERT INTO public.cards (num, section, icon, name, rarity, bonus, shift) VALUES
  (51,'relic','🐉','Чешуя Дракона','epic','+10 XP ко всем заданиям',1),
  (52,'relic','🌱','Семя Теры','epic','+10% к биотеху',2),
  (53,'relic','🔮','Кристалл Времени','epic','+10% к аналитике',3),
  (54,'relic','⚙️','Шестерёнка Будущего','epic','+10% к IT',4),
  (55,'relic','🧬','Био-Ядро','epic','+10% к спорту',5),
  (56,'relic','🔑','Ключ Города','epic','+10% к навигации',6),
  (57,'relic','💾','Smart-Чип','epic','+10% к проектированию',7),
  (58,'relic','🪙','Монета Студии','epic','+10% к креативу',8),
  (59,'relic','🏅','Медаль Чемпиона','epic','+10% к настойчивости',9),
  (60,'relic','🗿','Артефакт Острова','epic','+10% ко всем навыкам',10)
ON CONFLICT (num) DO NOTHING;

INSERT INTO public.cards (num, section, icon, name, rarity, condition) VALUES
  (61,'badge','⏱️','Спидраннер','rare','Заверши 3 задания за день'),
  (62,'badge','💎','Перфекционист','epic','Получи 5/5 в 5 заданиях подряд'),
  (63,'badge','🦉','Ночная Сова','rare','Выполни задание после 20:00'),
  (64,'badge','🐦','Ранняя Пташка','rare','Выполни задание до 10:00'),
  (65,'badge','🧭','Исследователь','legendary','Попробуй все 7 направлений за смену')
ON CONFLICT (num) DO NOTHING;

INSERT INTO public.cards (num, section, icon, name, rarity, week, hp, reward) VALUES
  (66,'boss','🐉','Кибер-Дракон','legendary',1,500,'150 XP, 30 🪙, значок'),
  (67,'boss','🗿','Терра-Голем','legendary',2,750,'200 XP, 40 🪙, значок'),
  (68,'boss','👻','Хроно-Фантом','legendary',3,1000,'250 XP, 50 🪙, значок'),
  (69,'boss','👑','Нео-Король','legendary',4,1500,'400 XP, 80 🪙, значок')
ON CONFLICT (num) DO NOTHING;

INSERT INTO public.cards (num, section, icon, name, rarity, price, item_type, bonus) VALUES
  (70,'shop','⚡','XP-бустер','rare','50 🪙','Расходник','+50 XP к следующему заданию'),
  (71,'shop','💡','Подсказка баджа','rare','30 🪙','Расходник','Показать критерий случайного баджа'),
  (72,'shop','🎒','Доп. слот','legendary','100 🪙','Постоянный','+1 слот инвентаря'),
  (73,'shop','📦','Редкий сундук','rare','75 🪙','Расходник','Гарантированный rare-предмет'),
  (74,'shop','🎨','Цвет имени','epic','60 🪙','Косметика','Разноцветное имя в профиле'),
  (75,'shop','🖼️','Рамка профиля','epic','120 🪙','Косметика','Уникальная рамка аватара'),
  (76,'shop','👑','Титул','epic','200 🪙','Косметика','Персональный титул в профиле'),
  (77,'shop','🗝️','Ключ Легенды','rare','300 🪙','Расходник','Открывает Легендарный сундук')
ON CONFLICT (num) DO NOTHING;

INSERT INTO public.cards (num, section, icon, name, rarity, chance, value_type, value) VALUES
  (78,'mystery','⚡','+25 XP','common','40%','XP','25'),
  (79,'mystery','💫','+50 XP','common','25%','XP','50'),
  (80,'mystery','🪙','+10 НЕО-коинов','common','15%','Монеты','10'),
  (81,'mystery','💰','+25 НЕО-коинов','common','10%','Монеты','25'),
  (82,'mystery','📦','Редкий предмет','rare','5%','Предмет','1'),
  (83,'mystery','🎁','Эпический предмет','epic','3%','Предмет','1'),
  (84,'mystery','🏆','Легендарный предмет','legendary','2%','Предмет','1')
ON CONFLICT (num) DO NOTHING;
