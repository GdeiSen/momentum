# 🎯 Momentum

**Habit Tracker с командными испытаниями, геймификацией и аналитикой**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-20+-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)

---

## 📋 Содержание

- [Обзор проекта](#обзор-проекта)
- [Технологический стек](#технологический-стек)
- [Архитектура системы](#архитектура-системы)
- [Быстрый старт](#быстрый-старт)
- [Структура проекта](#структура-проекта)
- [Функциональность](#функциональность)
- [Docker Deployment](#docker-deployment)
- [Разработка](#разработка)
- [API Reference](#api-reference)

---

## 🔎 Обзор проекта

**Momentum** — это современное веб-приложение для отслеживания привычек с фокусом на командное взаимодействие и геймификацию.

### Ключевые особенности

- 👥 **Командные испытания** — Создавайте команды и соревнуйтесь в выполнении привычек
- 📊 **Визуальная таблица прогресса** — GitHub-style heatmap для отслеживания прогресса
- 🎮 **Геймификация** — Streak счётчики, лидерборды, достижения
- 🔐 **Ролевая система** — Owner, Admin, Member с разными правами
- 🌓 **Тёмная/светлая тема** — Полная поддержка системных настроек
- 📱 **Responsive дизайн** — Работает на всех устройствах

---

## 🛠 Технологический стек

### Backend (momentum-server)

| Технология | Назначение |
|------------|------------|
| **NestJS** | Backend фреймворк |
| **Prisma** | ORM для PostgreSQL |
| **PostgreSQL** | Реляционная БД |
| **MinIO** | S3-совместимое хранилище |
| **Passport.js** | JWT аутентификация |
| **Swagger** | API документация |

### Frontend (momentum-client)

| Технология | Назначение |
|------------|------------|
| **Next.js 15** | React фреймворк (App Router) |
| **React 19** | UI библиотека |
| **TypeScript** | Типизация |
| **Tailwind CSS 4** | Стилизация |
| **shadcn/ui** | UI компоненты |
| **Zustand** | State management |

### Infrastructure

| Технология | Назначение |
|------------|------------|
| **Docker** | Контейнеризация |
| **Docker Compose** | Оркестрация сервисов |
| **Nginx** | Reverse proxy (production) |

---

## 🏗 Архитектура системы

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            MOMENTUM SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌───────────────────┐                    ┌───────────────────┐        │
│   │                   │                    │                   │        │
│   │   momentum-client │◀─── HTTP/WS ───── ▶│  momentum-server  │        │
│   │     (Next.js)     │                    │    (NestJS)       │        │
│   │                   │                    │                   │        │
│   │   Port: 3000      │                    │   Port: 3001      │        │
│   │                   │                    │                   │        │
│   └───────────────────┘                    └─────────┬─────────┘        │
│                                                      │                  │
│                              ┌───────────────────────┼─────────────┐    │
│                              │                       │             │    │
│                              ▼                       ▼             │    │
│                  ┌───────────────────┐   ┌───────────────────┐     │    │
│                  │                   │   │                   │     │    │
│                  │    PostgreSQL     │   │      MinIO        │     │    │
│                  │   (Database)      │   │   (S3 Storage)    │     │    │
│                  │                   │   │                   │     │    │
│                  │   Port: 5432      │   │  Ports: 9010/9011 │     │    │
│                  │                   │   │                   │     │    │
│                  └───────────────────┘   └───────────────────┘     │    │
│                                                                    │    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Browser │────▶│  Next.js │────▶│  NestJS  │────▶│ Postgres │
│          │◀────│  Client  │◀────│  Server  │◀────│          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                                  │
     │                                  │
     │                           ┌──────────┐
     │                           │  MinIO   │
     │                           │ (files)  │
     └───────────────────────────▶──────────┘
```

---

## ⚡ Быстрый старт

### Предварительные требования

- Docker & Docker Compose v2+
- Git
- (Опционально) Node.js 20+ для локальной разработки

### 1. Клонирование репозитория

```bash
git clone https://github.com/your-username/momentum.git
cd momentum
```

### 2. Настройка окружения

```bash
# Копирование примера конфигурации
cp .env.example .env

# Редактирование конфигурации (опционально)
nano .env
```

### 3. Установка CLI инструмента

```bash
# Установка зависимостей CLI
npm install

# CLI инструмент готов к использованию!
```

### 4. Запуск через CLI (Рекомендуется)

```bash
# Интерактивное меню
npm run dev
# или
./bin/momentum.js dev

# Или используйте прямые команды:
npm start              # Запустить всё (Docker)
npm start -- --mode local  # Запустить всё локально
npm run stop           # Остановить всё
npm run status         # Статус сервисов
npm run logs           # Просмотр логов
npm run migrate        # Применить миграции
npm run seed           # Заполнить БД тестовыми данными
```

### 5. Запуск через Docker Compose (Альтернатива)

```bash
# Сборка и запуск всех сервисов
docker compose up -d

# Проверка статуса
docker compose ps

# Применение миграций БД
docker compose exec server npx prisma migrate deploy

# (Опционально) Заполнение тестовыми данными
docker compose exec server npx prisma db seed
```

### 6. Доступ к приложению

| Сервис | URL | Описание |
|--------|-----|----------|
| **Frontend** | http://localhost:3000 | Веб-приложение |
| **Backend API** | http://localhost:3001/api | REST API |
| **Swagger Docs** | http://localhost:3001/api/docs | API документация |
| **MinIO Console** | http://localhost:9011 | S3 консоль |

### 7. Тестовые учётные данные

После seed в системе доступны:

| Email | Пароль | Роль |
|-------|--------|------|
| alice@example.com | Demo@123 | Owner |
| bob@example.com | Demo@123 | Admin |
| charlie@example.com | Demo@123 | Member |

---

## 📁 Структура проекта

```
momentum/
│
├── docker-compose.yml          # Оркестрация сервисов
├── .env.example                 # Пример конфигурации
├── README.md                    # Этот файл
│
├── momentum-server/             # Backend (NestJS)
│   ├── prisma/
│   │   ├── schema.prisma        # Схема БД
│   │   ├── migrations/          # SQL миграции
│   │   └── seed.ts              # Тестовые данные
│   │
│   ├── src/
│   │   ├── modules/             # Feature модули
│   │   │   ├── auth/            # Аутентификация
│   │   │   ├── users/           # Пользователи
│   │   │   ├── teams/           # Команды
│   │   │   ├── challenges/      # Испытания
│   │   │   ├── habits/          # Привычки
│   │   │   ├── habit-logs/      # Логи привычек
│   │   │   └── storage/         # S3 хранилище
│   │   │
│   │   ├── common/              # Декораторы, Guards
│   │   ├── prisma/              # Prisma модуль
│   │   ├── app.module.ts        # Root модуль
│   │   └── main.ts              # Entry point
│   │
│   ├── Dockerfile               # Production image
│   ├── Dockerfile.dev           # Development image
│   └── README.md                # Документация backend
│
└── momentum-client/             # Frontend (Next.js)
    ├── app/                     # App Router страницы
    │   ├── (auth)/              # Auth страницы
    │   └── (dashboard)/         # Защищённые страницы
    │
    ├── components/
    │   ├── ui/                  # shadcn/ui компоненты
    │   ├── layout/              # Sidebar, Header
    │   ├── providers/           # React провайдеры
    │   └── challenge/           # Feature компоненты
    │
    ├── lib/
    │   ├── api/                 # API клиент
    │   └── stores/              # Zustand stores
    │
    ├── Dockerfile               # Docker image
    └── README.md                # Документация frontend
```

---

## 🎯 Функциональность

### Реализовано (v1.0)

#### Аутентификация
- ✅ Регистрация с валидацией
- ✅ Вход с JWT токенами
- ✅ Refresh токены
- ✅ Защита роутов

#### Пользователи
- ✅ Профиль пользователя
- ✅ Редактирование профиля
- ✅ Смена пароля
- ✅ Настраиваемый dashboard

#### Команды
- ✅ Создание команд
- ✅ Присоединение к командам
- ✅ Управление участниками
- ✅ Ролевая система (Owner/Admin/Member)

#### Испытания (Challenges)
- ✅ Создание испытаний с датами
- ✅ Добавление привычек
- ✅ Статистика выполнения
- ✅ Лидерборд участников

#### Таблица привычек
- ✅ Интерактивная таблица прогресса
- ✅ Бесконечный скролл по датам
- ✅ Sticky заголовки (год/месяц/день)
- ✅ Контекстное меню для отметок
- ✅ Цветовая индикация статусов
- ✅ Keyboard навигация

### В разработке (v2.0)

- ⏳ WebSocket чат в командах
- ⏳ Загрузка аватаров и фонов
- ⏳ Push уведомления
- ⏳ Экспорт статистики

---

## 🐳 Docker Deployment

### Сервисы Docker Compose

| Сервис | Image | Порты | Описание |
|--------|-------|-------|----------|
| `postgres` | postgres:16-alpine | 5432 | База данных |
| `minio` | minio/minio:latest | 9010, 9011 | S3 хранилище |
| `server` | Custom (NestJS) | 3001 | Backend API |
| `client` | Custom (Next.js) | 3000 | Frontend |

### Основные команды

```bash
# Запуск всех сервисов
docker compose up -d

# Остановка всех сервисов
docker compose down

# Просмотр логов
docker compose logs -f [service]

# Пересборка образов
docker compose build

# Вход в контейнер
docker compose exec [service] sh

# Полная очистка (с данными!)
docker compose down -v
```

### Volumes (персистентные данные)

| Volume | Назначение |
|--------|------------|
| `postgres_data` | Данные PostgreSQL |
| `minio_data` | Файлы MinIO |

### Health Checks

```bash
# Postgres
docker compose exec postgres pg_isready

# Server
curl http://localhost:3001/api/health

# Client
curl http://localhost:3000
```

---

## 👨‍💻 Разработка

### CLI Инструмент

Проект включает удобный CLI инструмент для управления всей инфраструктурой. Он поддерживает как локальный, так и Docker режимы запуска.

#### Установка

```bash
# В корне проекта
npm install
```

#### Доступные команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Интерактивное меню для управления сервисами |
| `npm start` | Запустить все сервисы (Docker) |
| `npm start -- --mode local` | Запустить все сервисы локально |
| `npm run stop` | Остановить все сервисы |
| `npm run status` | Показать статус всех сервисов |
| `npm run logs [service]` | Показать логи (опционально указать сервис) |
| `npm run migrate` | Применить миграции Prisma |
| `npm run seed` | Заполнить БД тестовыми данными |

#### Интерактивное меню

Запустите `npm run dev` для доступа к интерактивному меню:

```
Выберите действие:
❯ 🚀 Запустить всё (Docker)
  🚀 Запустить всё (локально)
  🛑 Остановить всё
  📊 Статус сервисов
  📝 Логи
  🗄️  Миграции БД
  🌱 Заполнить БД тестовыми данными
  ❌ Выход
```

#### Прямое использование CLI

```bash
# Использование через bin файл
./bin/momentum.js start          # Запустить всё (Docker)
./bin/momentum.js start --mode local  # Запустить локально
./bin/momentum.js stop            # Остановить всё
./bin/momentum.js status          # Статус
./bin/momentum.js logs server     # Логи сервера
./bin/momentum.js migrate         # Миграции
./bin/momentum.js seed            # Seed данных
./bin/momentum.js infra start     # Только инфраструктура
./bin/momentum.js infra stop      # Остановить инфраструктуру
```

#### Режимы запуска

**Docker режим** (по умолчанию):
- Все сервисы запускаются в Docker контейнерах
- Инфраструктура (PostgreSQL, MinIO) всегда в Docker
- Сервер и клиент также в Docker

**Локальный режим** (`--mode local`):
- Инфраструктура (PostgreSQL, MinIO) в Docker
- Сервер и клиент запускаются локально через npm
- Удобно для разработки с hot-reload

### Локальная разработка без Docker

#### Backend

```bash
cd momentum-server
npm install
cp .env.example .env
# Настройте DATABASE_URL на локальный Postgres

npx prisma generate
npx prisma migrate dev
npm run start:dev
```

#### Frontend

```bash
cd momentum-client
npm install
npm run dev
```

### Полезные скрипты

```bash
# Backend
npm run start:dev     # Development с hot-reload
npm run build         # Production сборка
npm run lint          # Проверка кода
npx prisma studio     # GUI для БД

# Frontend
npm run dev           # Development server
npm run build         # Production сборка
npm run lint          # Проверка кода
```

### Работа с Prisma

```bash
# Создание миграции
npx prisma migrate dev --name migration_name

# Применение миграций (production)
npx prisma migrate deploy

# Сброс БД
npx prisma migrate reset

# Открыть Prisma Studio
npx prisma studio

# Seed данных
npx prisma db seed
```

---

## 📡 API Reference

### Основные endpoints

| Endpoint | Описание |
|----------|----------|
| `POST /api/auth/register` | Регистрация |
| `POST /api/auth/login` | Вход |
| `POST /api/auth/refresh` | Refresh токен |
| `GET /api/users/profile` | Профиль |
| `GET /api/teams` | Мои команды |
| `POST /api/teams` | Создать команду |
| `GET /api/teams/:id/challenges` | Испытания команды |
| `POST /api/habit-logs` | Отметить привычку |
| `GET /api/habit-logs/challenge/:id/table` | Данные таблицы |

### Swagger документация

Полная интерактивная документация API доступна по адресу:

```
http://localhost:3001/api/docs
```

---

## 📝 Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# ============================================
# Database
# ============================================
POSTGRES_USER=momentum
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=momentum_db
POSTGRES_PORT=5432

# ============================================
# JWT Authentication
# ============================================
JWT_ACCESS_SECRET=your_32_char_access_secret_key_here
JWT_REFRESH_SECRET=your_32_char_refresh_secret_key_here
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# ============================================
# MinIO S3 Storage
# ============================================
MINIO_ROOT_USER=momentum_admin
MINIO_ROOT_PASSWORD=your_minio_password
MINIO_API_PORT=9010
MINIO_CONSOLE_PORT=9011
MINIO_BUCKET=momentum-uploads

# ============================================
# Server Configuration
# ============================================
SERVER_PORT=3001
CLIENT_PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# ============================================
# URLs (for production)
# ============================================
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MINIO_URL=http://localhost:9010
```

---

## 🤝 Контрибьютинг

1. Fork репозитория
2. Создайте feature branch: `git checkout -b feature/amazing-feature`
3. Commit изменения: `git commit -m 'Add amazing feature'`
4. Push в branch: `git push origin feature/amazing-feature`
5. Откройте Pull Request

### Coding Standards

- TypeScript strict mode
- ESLint + Prettier
- Conventional Commits
- См. [CONTRIBUTING.md](CONTRIBUTING.md) для деталей

---

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE) для деталей.

---

## 🙏 Благодарности

- [NestJS](https://nestjs.com/) - Backend фреймворк
- [Next.js](https://nextjs.org/) - Frontend фреймворк
- [shadcn/ui](https://ui.shadcn.com/) - UI компоненты
- [Prisma](https://www.prisma.io/) - ORM
- [Tailwind CSS](https://tailwindcss.com/) - Стилизация

---

<p align="center">
  Made with ❤️ for better habits
</p>
