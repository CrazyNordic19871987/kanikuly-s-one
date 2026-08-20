# 🎯 Каникулы с ONE!

Веб-приложение для управления летним лагерем — образовательная игра-стратегия с погружением в профессии для детей 7–12 лет.

![Version](https://img.shields.io/badge/version-1.0.0-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-green)


## 📋 О проекте

**Каникулы с ONE!** — это:
- 🎮 Геймифицированное обучение (не лекции, а игра-стратегия)
- 🧬 3 образовательных трека: **Биотехнологии**, **Инженерия**, **Медиа**
- 💼 12 современных компетенций (Коммуникация, Кооперация, Критическое мышление и др.)
- 🎯 DISC-профилирование с цветовой индикацией
- 📊 Персональные рекомендации по профессиям
- 🖨️ Генерация PDF для отчётов

## ⚙️ Технологии

| Технология | Назначение |
|-------------|-------------|
| **HTML5 / CSS3** | Структура и стили (CSS Grid, Flexbox, Gridient) |
| **Vanilla JavaScript** | Логика приложения (ES6+) |
| **Supabase** | База данных (PostgreSQL) + REST API |
| **GitHub Pages** | Бесплатный хостинг |
| **Google Fonts** | Space Grotesk, Orbitron, JetBrains Mono |

---

## 📂 Структура проекта

```
Амакс2/
├── index.html              ← Главный файл (5 страниц в одном HTML)
├── logo.png               ← Логотип лагеря
├── bg.png                 ← Фоновое изображение
├── README.md              ← Этот файл
├── _nojekyll              ← Для корректной работы GitHub Pages
└── js/
    ├── config.js           ← Настройки Supabase + константы проекта
    ├── api.js              ← API-слой (работа с Supabase REST)
    └── app.js              ← Логика приложения (5 страниц)
```

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
  shift integer check (shift >= 1 and shift <= 6),
  notes text,
  created_at timestamp with time zone default now()
);

-- 2. Таблица наблюдений (оценки)
create table if not exists public.observations (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.students(id) on delete cascade not null,
  day integer check (day >= 1 and day <= 10) not null,
  track text check (track in ('bio', 'eng', 'media')) not null,
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

-- Индексы для производительности
create index if not exists idx_students_squad on public.students(squad);
create index if not exists idx_obs_student on public.observations(student_id);
create index if not exists idx_badges_student on public.badges(student_id);

-- Row Level Security (открытый доступ)
alter table public.students enable row level security;
alter table public.observations enable row level security;
alter table public.badges enable row level security;

create policy "Public access" on public.students for all using (true) with check (true);
create policy "Public access" on public.observations for all using (true) with check (true);
create policy "Public access" on public.badges for all using (true) with check (true);
```

---

## 📱 Страницы приложения

| Страница | Функционал |
|----------|-------------|
| 👥 **Участники** | Регистрация, список, быстрый просмотр |
| 📋 **КТП** | 30 заданий (10 дней × 3 трека), оценки |
| 🏅 **Достижения** | Автоначисление 9 значков |
| 🎯 **Таланты** | DISC, радар компетенций, рекомендации |
| 📊 **Дашборд** | Статистика по лагерю, фильтры |
| 🏕️ **О лагере** | Концепция, клубы, команда, инфраструктура |

---

## 🎨 Цветовая схема

| Цвет | HEX | Назначение |
|------|-----|-------------|
| 🟠 Оранжевый | `#ed7615` | Акценты, кнопки, логотип |
| 🔵 Тёмно-синий | `#132245` | Основной фон |
| ⚪ Белый | `#ffffff` | Текст, иконки |

---

## 🏕️ Клубы

| Клуб | Описание | Открывается |
|------|-------------|-------------|
| ⚽ Спорт | Футбол, волейбол, плавание | День 1 |
| 🎨 Творчество | Лепка, арт, пирография | День 1 |
| 🛋 Релакс | Отдых, природа, гамак | День 5 |
| 🎮 Кибер | FIFA, Minecraft, PS5 | День 7 |

---

## 🎓 Треки и профессии

### 🧬 Биотехнологии
- Биоинженер
- Агротехнолог
- Генетик

### ⚙️ Инженерия
- Робототехник
- Аналитик данных
- Разработчик ИИ

### 🎥 Медиа
- Видеограф
- Продюсер
- Блогер

---

## 📄 Лицензия

MIT License — свободное использование для образовательных целей.

---

## 🎉 Ключевые фишки

✅ **Геймификация** — не лекции, а игра-стратегия  
✅ **Реальные проекты** — умная теплица, научпоп-блог, видеоконтент  
✅ **Свобода выбора** — ребёнок сам решает, каким будет его день  
✅ **Постепенное открытие** — контент открывается по мере прогресса  
✅ **Профессиональное погружение** — каждое направление курирует эксперт  
✅ **Международная среда** — английский с носителями  

---

**Сделано с ❤️ для детей лагеря Каникулы с ONE!**
