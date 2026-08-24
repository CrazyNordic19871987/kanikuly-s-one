-- ═══════════════════════════════════════════════════════════════════
--  Добавляет PRIMARY KEY к content-таблицам для редактирования в Dashboard
-- ═══════════════════════════════════════════════════════════════════

-- content_shifts: PK на shift_id
ALTER TABLE public.content_shifts DROP CONSTRAINT IF EXISTS content_shifts_pkey;
ALTER TABLE public.content_shifts ADD PRIMARY KEY (shift_id);

-- content_competencies: PK на comp_id
ALTER TABLE public.content_competencies DROP CONSTRAINT IF EXISTS content_competencies_pkey;
ALTER TABLE public.content_competencies ADD PRIMARY KEY (comp_id);

-- content_badge_definitions: PK на badge_id
ALTER TABLE public.content_badge_definitions DROP CONSTRAINT IF EXISTS content_badge_definitions_pkey;
ALTER TABLE public.content_badge_definitions ADD PRIMARY KEY (badge_id);

-- content_disc_config: PK на config_key
ALTER TABLE public.content_disc_config DROP CONSTRAINT IF EXISTS content_disc_config_pkey;
ALTER TABLE public.content_disc_config ADD PRIMARY KEY (config_key);

-- content_missions: уже имеет SERIAL PRIMARY KEY (id) — ОК
