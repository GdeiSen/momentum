# 🚀 Momentum Server

Backend API сервер для приложения Momentum - трекер привычек с командными испытаниями, геймификацией и аналитикой.

## 📋 Содержание

- [Технологии](#технологии)
- [Архитектура](#архитектура)
- [Быстрый старт](#быстрый-старт)
- [Структура проекта](#структура-проекта)
- [API Документация](#api-документация)
- [База данных](#база-данных)
- [Переменные окружения](#переменные-окружения)
- [Разработка](#разработка)

---

## 🛠 Технологии

| Технология | Версия | Назначение |
|------------|--------|------------|
| **Node.js** | 20+ | Runtime |
| **NestJS** | 10.x | Фреймворк |
| **Prisma** | 5.x | ORM для PostgreSQL |
| **PostgreSQL** | 16 | База данных |
| **MinIO** | Latest | S3-совместимое хранилище |
| **Passport.js** | - | JWT аутентификация |
| **Swagger** | - | API документация |
| **class-validator** | - | Валидация DTO |

---

## 🏗 Архитектура

### Модульная структура NestJS

```
┌─────────────────────────────────────────────────────────────────┐
│                         App Module                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  AuthModule  │  │ UsersModule  │  │ TeamsModule  │           │
│  │              │  │              │  │              │           │
│  │ - JWT Auth   │  │ - Profiles   │  │ - CRUD Teams │           │
│  │ - Refresh    │  │ - Dashboard  │  │ - Members    │           │
│  │ - Sessions   │  │ - Settings   │  │ - Roles      │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Challenges   │  │  Habits      │  │  HabitLogs   │           │
│  │   Module     │  │   Module     │  │   Module     │           │
│  │              │  │              │  │              │           │
│  │ - Seasons    │  │ - Actions    │  │ - Tracking   │           │
│  │ - Events     │  │ - Goals      │  │ - Analytics  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ StorageModule│  │ PrismaModule │                             │
│  │              │  │              │                             │
│  │ - MinIO S3   │  │ - DB Client  │                             │
│  │ - Upload     │  │ - Migrations │                             │
│  └──────────────┘  └──────────────┘                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Паттерны проектирования

- **Service Layer Pattern** — Бизнес-логика изолирована в сервисах
- **Repository Pattern** — Через Prisma Client
- **Guard Pattern** — Защита роутов через Guards
- **Decorator Pattern** — Кастомные декораторы (@CurrentUser, @Roles, @Public)
- **DTO Pattern** — Валидация входных данных через class-validator

### Ролевая модель доступа (RBAC)

```
┌─────────────────────────────────────────────────────────────┐
│                     Team Roles Hierarchy                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  OWNER ──────────────────────────────────────────────────┐  │
│    │                                                     │  │
│    ├── Полный контроль над командой                      │  │
│    ├── Удаление команды                                  │  │
│    ├── Передача владения                                 │  │
│    └── Все права ADMIN                                   │  │
│                                                          │  │
│  ADMIN ──────────────────────────────────────────────────┤  │
│    │                                                     │  │
│    ├── Управление участниками                            │  │
│    ├── CRUD Challenges и Habits                          │  │
│    ├── Отметка "пропуск" за других пользователей         │  │
│    └── Все права MEMBER                                  │  │
│                                                          │  │ 
│  MEMBER ─────────────────────────────────────────────────┘  │
│    │                                                        │
│    ├── Просмотр команды и участников                        │
│    ├── Участие в Challenges                                 │
│    └── Отметка собственных привычек                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ Быстрый старт

### Предварительные требования

- Docker & Docker Compose
- Node.js 20+ (для локальной разработки)
- npm или yarn

### Запуск через Docker Compose (рекомендуется)

```bash
# Из корня проекта (где docker-compose.yml)
cd /path/to/project

# Запуск всех сервисов
docker compose up -d

# Применение миграций БД
docker compose exec server npx prisma migrate deploy

# Просмотр логов сервера
docker compose logs -f server
```

### Локальная разработка

```bash
# Переход в папку сервера
cd momentum-server

# Установка зависимостей
npm install

# Копирование конфига окружения
cp .env.example .env

# Генерация Prisma Client
npx prisma generate

# Применение миграций
npx prisma migrate dev

# Заполнение тестовыми данными (опционально)
npx prisma db seed

# Запуск в режиме разработки
npm run start:dev
```

### Проверка работоспособности

```bash
# Health check
curl http://localhost:3001/api/health

# Swagger документация
open http://localhost:3001/api/docs
```

---

## 📁 Структура проекта

```
momentum-server/
├── prisma/
│   ├── migrations/          # SQL миграции
│   ├── schema.prisma        # Схема базы данных
│   └── seed.ts              # Тестовые данные
│
├── src/
│   ├── common/              # Общие компоненты
│   │   ├── decorators/      # @CurrentUser, @Roles, @Public
│   │   ├── guards/          # TeamRolesGuard
│   │   └── types/           # Общие типы
│   │
│   ├── modules/
│   │   ├── auth/            # Аутентификация
│   │   │   ├── dto/         # LoginDto, RegisterDto, RefreshDto
│   │   │   ├── guards/      # JwtAuthGuard
│   │   │   ├── strategies/  # JwtStrategy, JwtRefreshStrategy
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── sessions.service.ts
│   │   │
│   │   ├── users/           # Пользователи
│   │   │   ├── dto/         # UpdateProfileDto, ChangePasswordDto
│   │   │   ├── users.controller.ts
│   │   │   └── users.service.ts
│   │   │
│   │   ├── teams/           # Команды
│   │   │   ├── dto/         # CreateTeamDto, UpdateMemberRoleDto
│   │   │   ├── teams.controller.ts
│   │   │   ├── teams.service.ts
│   │   │   └── team-members.service.ts
│   │   │
│   │   ├── challenges/      # Испытания (сезоны)
│   │   │   ├── dto/         # CreateChallengeDto, UpdateChallengeDto
│   │   │   ├── challenges.controller.ts
│   │   │   └── challenges.service.ts
│   │   │
│   │   ├── habits/          # Привычки
│   │   │   ├── dto/         # CreateHabitDto, UpdateHabitDto
│   │   │   ├── habits.controller.ts
│   │   │   └── habits.service.ts
│   │   │
│   │   ├── habit-logs/      # Логирование привычек
│   │   │   ├── dto/         # CreateHabitLogDto, BulkUpdateDto
│   │   │   ├── habit-logs.controller.ts
│   │   │   └── habit-logs.service.ts
│   │   │
│   │   └── storage/         # S3 хранилище
│   │       ├── dto/         # GetPresignedUrlDto
│   │       ├── storage.controller.ts
│   │       └── storage.service.ts
│   │
│   ├── prisma/              # Prisma модуль
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── app.module.ts        # Корневой модуль
│   └── main.ts              # Точка входа
│
├── test/                    # Тесты
├── Dockerfile               # Production образ
├── Dockerfile.dev           # Development образ
├── nest-cli.json
├── package.json
└── tsconfig.json
```

---

## 📡 API Документация

### Аутентификация (`/api/auth`)

| Метод | Endpoint | Описание | Доступ |
|-------|----------|----------|--------|
| POST | `/register` | Регистрация | Public |
| POST | `/login` | Вход | Public |
| POST | `/refresh` | Обновление токена | Public |
| POST | `/logout` | Выход | Auth |
| GET | `/me` | Текущий пользователь | Auth |

### Пользователи (`/api/users`)

| Метод | Endpoint | Описание | Доступ |
|-------|----------|----------|--------|
| GET | `/profile` | Получить профиль | Auth |
| PATCH | `/profile` | Обновить профиль | Auth |
| PATCH | `/password` | Изменить пароль | Auth |
| GET | `/dashboard` | Настройки дашборда | Auth |
| PUT | `/dashboard` | Сохранить дашборд | Auth |

### Команды (`/api/teams`)

| Метод | Endpoint | Описание | Доступ |
|-------|----------|----------|--------|
| GET | `/` | Мои команды | Auth |
| POST | `/` | Создать команду | Auth |
| GET | `/:id` | Детали команды | Member |
| PATCH | `/:id` | Обновить команду | Admin |
| DELETE | `/:id` | Удалить команду | Owner |
| POST | `/:id/join` | Вступить в команду | Auth |
| POST | `/:id/leave` | Покинуть команду | Member |
| GET | `/:id/members` | Участники | Member |
| PATCH | `/:id/members/:userId` | Изменить роль | Admin |
| DELETE | `/:id/members/:userId` | Удалить участника | Admin |

### Испытания (`/api/teams/:teamId/challenges`)

| Метод | Endpoint | Описание | Доступ |
|-------|----------|----------|--------|
| GET | `/` | Список испытаний | Member |
| POST | `/` | Создать испытание | Admin |
| GET | `/:id` | Детали испытания | Member |
| PATCH | `/:id` | Обновить испытание | Admin |
| DELETE | `/:id` | Удалить испытание | Admin |
| GET | `/:id/statistics` | Статистика | Member |

### Привычки (`/api/habits`)

| Метод | Endpoint | Описание | Доступ |
|-------|----------|----------|--------|
| POST | `/` | Создать привычку | Admin |
| GET | `/:id` | Детали привычки | Member |
| PATCH | `/:id` | Обновить привычку | Admin |
| DELETE | `/:id` | Удалить привычку | Admin |

### Логи привычек (`/api/habit-logs`)

| Метод | Endpoint | Описание | Доступ |
|-------|----------|----------|--------|
| POST | `/` | Создать/обновить лог | Member |
| GET | `/challenge/:id/table` | Данные для таблицы | Member |
| DELETE | `/:id` | Удалить лог | Owner/Admin |

---

## 🗃 База данных

### Схема данных (ERD)

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│   User      │       │  TeamMember  │       │    Team     │
├─────────────┤       ├──────────────┤       ├─────────────┤
│ id          │───┬───│ userId       │───────│ id          │
│ email       │   │   │ teamId       │───────│ name        │
│ nickname    │   │   │ role         │       │ ownerId     │───┐
│ avatarUrl   │   │   └──────────────┘       │ description │   │
│ bio         │   │                          │ isPrivate   │   │
└─────────────┘   │                          └─────────────┘   │
      │           │                                │           │
      │           │   ┌──────────────┐             │           │
      │           │   │  Challenge   │             │           │
      │           │   ├──────────────┤             │           │
      │           │   │ id           │─────────────┘           │
      │           │   │ teamId       │                         │
      │           │   │ title        │                         │
      │           │   │ startDate    │                         │
      │           │   │ endDate      │                         │
      │           │   └──────────────┘                         │
      │           │          │                                 │
      │           │   ┌──────────────┐                         │
      │           │   │    Habit     │                         │
      │           │   ├──────────────┤                         │
      │           │   │ id           │                         │
      │           │   │ challengeId  │─────────────────────────┘
      │           │   │ title        │
      │           │   │ description  │
      │           │   └──────────────┘
      │           │          │
      │           │   ┌──────────────┐
      │           └───│  HabitLog    │
      │               ├──────────────┤
      └───────────────│ userId       │
                      │ habitId      │
                      │ date         │
                      │ status       │
                      │ note         │
                      └──────────────┘
```

### Перечисления (Enums)

```typescript
enum TeamRole {
  MEMBER,       // Обычный участник
  ADMIN,        // Администратор
  OWNER         // Владелец команды
}

enum HabitLogStatus {
  COMPLETED,        // Выполнено полностью
  PARTIAL,          // Частично выполнено
  SKIPPED_EXCUSED   // Пропуск по уважительной причине
}
```

### Команды Prisma

```bash
# Генерация клиента после изменения схемы
npx prisma generate

# Создание миграции
npx prisma migrate dev --name add_new_field

# Применение миграций (production)
npx prisma migrate deploy

# Сброс БД и применение миграций
npx prisma migrate reset

# Открыть Prisma Studio
npx prisma studio

# Заполнить тестовыми данными
npx prisma db seed
```

---

## ⚙️ Переменные окружения

Создайте файл `.env` в папке `momentum-server`:

```env
# ============================================
# Database
# ============================================
DATABASE_URL=postgresql://momentum:momentum_secret@localhost:5432/momentum_db?schema=public

# ============================================
# JWT Authentication
# ============================================
JWT_ACCESS_SECRET=your_super_secret_access_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# ============================================
# MinIO S3 Storage
# ============================================
MINIO_ENDPOINT=localhost
MINIO_PORT=9010
MINIO_ACCESS_KEY=momentum_admin
MINIO_SECRET_KEY=momentum_secret_key
MINIO_BUCKET=momentum-uploads
MINIO_USE_SSL=false

# ============================================
# OpenAI AI Chat (или совместимый провайдер)
# ============================================
OPENAI_API_KEY=your-access-id-or-api-key-here
OPENAI_API_URL=https://your-openai-compatible-provider-url.com/v1
OPENAI_MODEL=grok-4-fast

# ============================================
# Server
# ============================================
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

---

## 👨‍💻 Разработка

### Доступные скрипты

```bash
# Запуск в режиме разработки (hot-reload)
npm run start:dev

# Запуск в production режиме
npm run start:prod

# Сборка проекта
npm run build

# Линтинг
npm run lint

# Форматирование кода
npm run format

# Запуск тестов
npm run test

# Запуск e2e тестов
npm run test:e2e
```

### Полезные команды Docker

```bash
# Пересборка образа сервера
docker compose build server

# Вход в контейнер сервера
docker compose exec server sh

# Просмотр логов в реальном времени
docker compose logs -f server

# Перезапуск сервера
docker compose restart server

# Остановка всех сервисов
docker compose down

# Полная очистка (включая volumes)
docker compose down -v
```

### Отладка

1. **Swagger UI** доступен по адресу: `http://localhost:3001/api/docs`
2. **Prisma Studio** для работы с БД: `npx prisma studio`
3. **Логи** выводятся в консоль с цветовой разметкой

---

## 📝 Примечания

### Аутентификация

- Используется JWT с двумя токенами (access + refresh)
- Access токен: короткоживущий (15 мин), передается в заголовке Authorization
- Refresh токен: долгоживущий (7 дней), хранится в БД (sessions)
- Защита от XSS: токены хранятся в localStorage на клиенте
- Защита от CSRF: используются bearer токены вместо cookies

### Безопасность

- Пароли хешируются через bcrypt (12 раундов)
- Валидация всех входных данных через class-validator
- Rate limiting рекомендуется настроить на reverse proxy (nginx)
- CORS настроен для доверенных origins

---

## 🤝 Контрибьютинг

1. Создайте feature branch: `git checkout -b feature/amazing-feature`
2. Commit изменения: `git commit -m 'Add amazing feature'`
3. Push в branch: `git push origin feature/amazing-feature`
4. Откройте Pull Request

---

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE) для деталей.

