# 🏕️ Каникулы с ONE!

Веб-приложение для управления летними каникулами для детей 7–12 лет. 10 тематических смен, 7 профессиональных направлений, Anglophone-среда, спорт и защита собственных проектов перед родителями.

![Version](https://img.shields.io/badge/version-2.0.0-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-green)

## 🌐 Демо

**https://crazynordic19871987.github.io/kanikuly-s-one/**

---

## 📋 О проекте

**Каникулы с ONE!** — это:
- 🏕️ **10 тематических смен** — от «Кибер-Атлетов» до «Island Survival»
- 🗺️ **7 профессиональных направлений** — Спорт, IT, Биотех, Дипломатия, Медиа, Art & Design, Предпринимательство
- 🌍 **Anglophone-среда** — английский как язык общения, а не урок
- ⚽ **Превентивный спорт** — минимум 1,5–2 часа ежедневно
- 🧬 **Edutainment** — обучение через игру и практику
- 📦 **Продуктовый инкубатор** — каждый ребёнок доводит проект до готового продукта
- 🎮 **Геймификация** — внутренняя валюта, уровни, финальный вызов
- 📊 DISC-профилирование и персональные рекомендации
- 🖨️ Генерация PDF-отчётов

---

## ⚙️ Технологии

| Технология | Назначение |
|-------------|-------------|
| **HTML5 / CSS3** | Структура и стили (CSS Grid, Flexbox, Glassmorphism) |
| **Vanilla JavaScript** | Логика приложения (ES6+) |
| **Supabase** | База данных (PostgreSQL) + REST API |
| **GitHub Pages** | Бесплатный хостинг |
| **Google Fonts** | Space Grotesk, Orbitron, JetBrains Mono |

---

## 📂 Структура проекта

```
kanikuly-s-one/
├── index.html              ← Главный файл (sidebar + страницы)
├── app.js                  ← Логика приложения
├── logo.svg                ← Тематический логотип (солнце + палатка)
├── bg.png                  ← Фоновое изображение
├── README.md               ← Этот файл
├── _nojekyll               ← Для корректной работы GitHub Pages
└── js/
    ├── config.js           ← Supabase + 10 смен + 7 направлений + компетенции
    ├── api.js              ← API-слой (работа с Supabase REST)
    └── app.js              ← Дубль логики приложения
```

---

## 🏕️ Смены

| # | Название | Направления |
|---|----------|-------------|
| 1 | Кибер-Атлеты: Хроники Будущего | Спорт · IT · Биотех · Предпринимательство |
| 2 | Terraforming: Колонизаторы Новых Миров | Спорт · Биотех · Дипломатия · Предпринимательство |
| 3 | Meta-Agency: Детективы Времени | Медиа · Спорт · IT · Дипломатия |
| 4 | Future Makers: Академия Прикладного Будущего | IT · Биотех · Art & Design · Спорт · Предпринимательство |
| 5 | Active Tech 2077: Академия Био-Тех Спорта | Спорт · Биотех · IT · Предпринимательство |
| 6 | Urban Quest: Агенты Городского Разума | IT · Медиа · Спорт · Art & Design · Предпринимательство |
| 7 | Smart City Lab: Архитекторы Умного Города | IT · Art & Design · Биотех · Спорт · Дипломатия |
| 8 | English Game Studio: Код Доступа | IT · Art & Design · Медиа · Предпринимательство · Спорт |
| 9 | Champions Academy: Био-Механика Побед | Спорт · Дипломатия · Предпринимательство |
| 10 | Island Survival: Eco-Tech Экспедиция | Спорт · Дипломатия · Предпринимательство |

---

## 🗺️ Профессиональные направления

| Направление | Описание |
|-------------|----------|
| 🏅 **Спорт** | Физподготовка, координация, командный дух |
| 💻 **IT** | Программирование, датчики, Arduino, micro:bit |
| 🧬 **Биотех** | Биохакинг, экология, сити-фермерство |
| 🤝 **Дипломатия** | Переговоры, координация, работа с конфликтами |
| 🎬 **Медиа** | Сторителлинг, съёмка, подкасты, промо-ролики |
| 🎨 **Art & Design** | Дизайн интерфейсов, концепт-арт, визуальная айдентика |
| 📊 **Предпринимательство** | Питчинг, юнит-экономика, защита проектов |

---

## 📱 Страницы приложения

| Страница | Функционал |
|----------|-------------|
| 👥 **Участники** | Регистрация, список, быстрый просмотр |
| 🏕️ **Смены** | 10 концепций смен, направления и миссии |
| 🏅 **Достижения** | Автоначисление 13 значков |
| 🎯 **Таланты** | DISC, радар компетенций, рекомендации |
| 📊 **Дашборд** | Статистика по каникулам, фильтры |

---

## 🗃️ SQL-схема для Supabase

```sql
-- Включаем UUID
create extension if not exists "uuid-ossp";

-- 1. Таблица участников
create table if not exists public.students (
  id uuid default uuid_generate_v4() primary key,
  first_name text not null,
  last_name text not null,
  age integer check (age >= 7 and age <= 12),
  gender text check (gender in ('Мужской', 'Женский')),
  grade integer check (grade >= 1 and grade <= 11),
  squad integer check (squad >= 1 and squad <= 8),
  shift integer check (shift >= 1 and shift <= 10),
  notes text,
  created_at timestamp with time zone default now()
);

-- 2. Таблица наблюдений (оценки)
create table if not exists public.observations (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students(id) on delete cascade not null,
  day integer check (day >= 1 and day <= 10) not null,
  track text check (track in ('bio', 'eng', 'media', 'english')) not null,
  independence integer check (independence >= 1 and independence <= 5) default 0,
  quality integer check (quality >= 1 and quality <= 5) default 0,
  initiative boolean default false,
  notes text,
  created_at timestamp with time zone default now()
);

-- 3. Таблица достижений
create table if not exists public.badges (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students(id) on delete cascade not null,
  badge_id text not null,
  name text not null,
  icon text,
  earned boolean default false,
  earned_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Индексы
create index if not exists idx_students_squad on public.students(squad);
create index if not exists idx_obs_student on public.observations(student_id);
create index if not exists idx_badges_student on public.badges(student_id);

-- Row Level Security
alter table public.students enable row level security;
alter table public.observations enable row level security;
alter table public.badges enable row level security;

create policy "Public access" on public.students for all using (true) with check (true);
create policy "Public access" on public.observations for all using (true) with check (true);
create policy "Public access" on public.badges for all using (true) with check (true);
```

---

## 🎨 Цветовая схема

| Цвет | HEX | Назначение |
|------|-----|-------------|
| 🟠 Оранжевый | `#ed7615` | Акценты, кнопки, логотип |
| 🔵 Тёмно-синий | `#132245` | Основной фон |
| ⚪ Белый | `#ffffff` | Текст, иконки |

---

## 🎓 7 составных продукта

Каждая смена включает все 7 компонентов:

1. **Edutainment** — обучение через игру и практику
2. **Phygital** — цифровой и физический опыт в одном сюжете
3. **Англоязычная среда** — жизнь на английском, а не уроки
4. **Превентивный спорт** — 1,5–2 часа ежедневно
5. **Навыки будущего** — критическое мышление, коммуникация, креативность
6. **Профессии будущего** — IT, дизайн, инженерия, медицина, экология
7. **Продуктовый инкубатор** — от идеи до защиты перед родителями

---

## 📄 Лицензия

MIT License — свободное использование для образовательных целей.

---

**Сделано с ❤️ для детей каникул Каникулы с ONE!**
