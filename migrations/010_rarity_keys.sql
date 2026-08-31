-- ═══════════════════════════════════════════════════════════════════
--  MIGRATION 010: Normalize card rarity to machine keys
--  cards.rarity stored Russian display strings (Обычный/Редкий/... ).
--  This migration rewrites them to machine keys (common/rare/epic/
--  legendary) to match content_badge_definitions / content_inventory_items.
--  The app now maps key -> Russian label at render time (rarityLabel).
--  Idempotent: only updates rows still holding Russian labels.
-- ═══════════════════════════════════════════════════════════════════

UPDATE public.cards
   SET rarity = CASE rarity
     WHEN 'Обычный'     THEN 'common'
     WHEN 'Редкий'      THEN 'rare'
     WHEN 'Эпический'   THEN 'epic'
     WHEN 'Легендарный' THEN 'legendary'
     ELSE rarity
   END
 WHERE rarity IN ('Обычный','Редкий','Эпический','Легендарный');

-- Also normalize any rows that may use the old default 'Обычный' literals
-- and the inventory items / badges tables in case they hold Russian labels:
UPDATE public.content_inventory_items
   SET rarity = CASE rarity
     WHEN 'Обычный'     THEN 'common'
     WHEN 'Редкий'      THEN 'rare'
     WHEN 'Эпический'   THEN 'epic'
     WHEN 'Легендарный' THEN 'legendary'
     ELSE rarity
   END
 WHERE rarity IN ('Обычный','Редкий','Эпический','Легендарный');

UPDATE public.content_badge_definitions
   SET rarity = CASE rarity
     WHEN 'Обычный'     THEN 'common'
     WHEN 'Редкий'      THEN 'rare'
     WHEN 'Эпический'   THEN 'epic'
     WHEN 'Легендарный' THEN 'legendary'
     ELSE rarity
   END
 WHERE rarity IN ('Обычный','Редкий','Эпический','Легендарный');

UPDATE public.badges
   SET rarity = CASE rarity
     WHEN 'Обычный'     THEN 'common'
     WHEN 'Редкий'      THEN 'rare'
     WHEN 'Эпический'   THEN 'epic'
     WHEN 'Легендарный' THEN 'legendary'
     ELSE rarity
   END
 WHERE rarity IN ('Обычный','Редкий','Эпический','Легендарный');

-- ═══════════════════════════════════════════════════════════════════
-- Done. Rarity now consistently uses machine keys across all tables.
-- ═══════════════════════════════════════════════════════════════════
