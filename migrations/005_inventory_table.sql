-- Таблица предметов инвентаря (как в Glide: управляется через Table Editor)
-- Если таблица пустая — приложение использует встроенные предметы (fallback).
-- Добавь строки вручную в Table Editor или выполни INSERT ниже.

CREATE TABLE IF NOT EXISTS public.content_inventory_items (
  id         TEXT PRIMARY KEY,
  shift_id   INT  NOT NULL,
  icon       TEXT,
  name       TEXT NOT NULL,
  rarity     TEXT NOT NULL DEFAULT 'common',  -- common | rare | legendary
  bonus      TEXT,
  image_url  TEXT                             -- Ссылка на картинку (Supabase Storage)
);

ALTER TABLE public.content_inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_inventory" ON public.content_inventory_items;
CREATE POLICY "anon_read_inventory"
  ON public.content_inventory_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "anon_all_inventory" ON public.content_inventory_items;
CREATE POLICY "anon_all_inventory"
  ON public.content_inventory_items FOR ALL USING (true);

-- Данные по умолчанию (можно удалить и вести только через Table Editor)
INSERT INTO public.content_inventory_items (id, shift_id, icon, name, rarity, bonus) VALUES
('cyber_neuropod',1,'⚡','Нейро-под','common','+5% к спорту'),
('cyber_blazecore',1,'🔥','Blaze-ядро','rare','+10% к спорту'),
('cyber_lasergun',1,'🔫','Лазер-пистолет','common','+5% к тактике'),
('cyber_balance',1,'⚖️','Балансборд','common','+5% к координации'),
('cyber_chip',1,'💾','Нейро-чип','rare','+10% к IT'),
('terra_seedpod',2,'🌱','Капсула-семя','common','+5% к биотеху'),
('terra_terraformer',2,'🏗️','Терраформер','rare','+10% к биотеху'),
('terra_rover',2,'🛞','Ровер-разведчик','common','+5% к исследованию'),
('terra_diploma',2,'🤝','Дипломатический мандат','common','+5% к дипломатии'),
('terra_colony',2,'🏕️','Колония','rare','+10% к команде'),
('meta_cam',3,'📹','Шпионская камера','common','+5% к медиа'),
('meta_disguise',3,'🎭','Маскировка','rare','+10% к медиа'),
('meta_decoder',3,'🔑','Декодер','common','+5% к IT'),
('meta_tagger',3,'🎯','Тагер','common','+5% к спорту'),
('meta_dossier',3,'📁','Досье агента','rare','+10% к аналитике'),
('maker_3dpen',4,'🖊️','3D-ручка','common','+5% к дизайну'),
('maker_printer',4,'🖨️','3D-принтер','rare','+10% к дизайну'),
('maker_sensor',4,'📡','Датчик','common','+5% к IT'),
('maker_flask',4,'🧪','Лабораторный стакан','common','+5% к биотеху'),
('maker_proto',4,'🧬','Прототип','rare','+10% к изобретениям'),
('active_exo',5,'🦾','Экзо-перчатка','common','+5% к спорту'),
('active_core',5,'⚙️','Био-ядро','rare','+10% к биотеху'),
('active_react',5,'⚡','Реактор','common','+5% к IT'),
('active_grip',5,'🧤','Силовая перчатка','common','+5% к силе'),
('active_amplifier',5,'🔋','Амплификатор','rare','+10% к производительности'),
('urban_map',6,'🗺️','Городская карта','common','+5% к навигации'),
('urban_signal',6,'📡','Сигнал','rare','+10% к IT'),
('urban_mic',6,'🎤','Репортёрский микрофон','common','+5% к медиа'),
('urban_spray',6,'🎨','Спрей-маркер','common','+5% к дизайну'),
('urban_blueprint',6,'📐','Городской чертёж','rare','+10% к стратегии'),
('smart_led',7,'💡','LED-модуль','common','+5% к IT'),
('smart_circuit',7,'🔌','Микросхема','rare','+10% к IT'),
('smart_brush',7,'🖌️','Кисть smart-художника','common','+5% к дизайну'),
('smart_biosample',7,'🧫','Био-образец','common','+5% к биотеху'),
('smart_scale',7,'⚖️','Миниатюрная модель','rare','+10% к архитектуре'),
('eng_dice',8,'🎲','Кубик историй','common','+5% к английскому'),
('eng_book',8,'📖','Сценарный буклет','rare','+10% к английскому'),
('eng_ctrl',8,'🎮','Геймпад','common','+5% к IT'),
('eng_palette',8,'🎨','Палитра','common','+5% к дизайну'),
('eng_stage',8,'🎭','Мини-сцена','rare','+10% к презентациям'),
('champ_medal',9,'🏅','Спортивная медаль','common','+5% к спорту'),
('champ_trophy',9,'🏆','Кубок чемпиона','rare','+15% к спорту'),
('champ_whistle',9,'📣','Судейский свисток','common','+5% к лидерству'),
('champ_flag',9,'🚩','Флаг команды','common','+5% к дипломатии'),
('champ_belt',9,'🥊','Чемпионский пояс','legendary','+20% ко всем'),
('island_compass',10,'🧭','Компас','common','+5% к навигации'),
('island_flare',10,'🔴','Ракета','rare','+10% к спасению'),
('island_cam',10,'📹','Экспедиционная камера','common','+5% к медиа'),
('island_knife',10,'🔪','Сапёрный нож','common','+5% к выживанию'),
('island_beacon',10,'📡','Спасательный маяк','legendary','+20% ко всем');
