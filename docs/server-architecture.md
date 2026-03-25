# Архитектура сервера Momentum

## Оглавление

1. [Обзор архитектуры](#обзор-архитектуры)
2. [Точка входа и конфигурация](#точка-входа-и-конфигурация)
3. [Модульная структура NestJS](#модульная-структура-nestjs)
4. [Система аутентификации и авторизации](#система-аутентификации-и-авторизации)
5. [Декораторы и Guards](#декораторы-и-guards)
6. [База данных и Prisma ORM](#база-данных-и-prisma-orm)
7. [Модули приложения](#модули-приложения)
8. [Взаимодействие между сервисами](#взаимодействие-между-сервисами)
9. [Система валидации и DTO](#система-валидации-и-dto)
10. [Хранилище файлов](#хранилище-файлов)

---

## Обзор архитектуры

Сервер Momentum построен на фреймворке **NestJS** - прогрессивном Node.js фреймворке для построения эффективных и масштабируемых серверных приложений. NestJS использует архитектурные паттерны из Angular и предоставляет мощную систему модулей, декораторов, dependency injection и других возможностей для создания enterprise-grade приложений.

### Основные технологии

- **NestJS 10.4.15** - основной фреймворк
- **Prisma ORM 6.1.0** - ORM для работы с базой данных
- **PostgreSQL** - реляционная база данных
- **JWT (JSON Web Tokens)** - для аутентификации
- **Passport.js** - стратегии аутентификации
- **Argon2** - хеширование паролей
- **MinIO** - S3-совместимое хранилище файлов
- **Swagger/OpenAPI** - документация API
- **class-validator** и **class-transformer** - валидация и трансформация данных

### Архитектурные принципы

1. **Модульность** - приложение разбито на независимые модули, каждый из которых отвечает за свою область функциональности
2. **Dependency Injection** - все зависимости внедряются через конструкторы, что обеспечивает тестируемость и гибкость
3. **Разделение ответственности** - Controllers обрабатывают HTTP-запросы, Services содержат бизнес-логику, Repositories (через Prisma) работают с данными
4. **Guards и Decorators** - для централизованной обработки аутентификации и авторизации
5. **DTO (Data Transfer Objects)** - для валидации и типизации входящих данных

---

## Точка входа и конфигурация

### main.ts - Инициализация приложения

Файл `main.ts` является точкой входа в приложение. Здесь происходит инициализация NestJS приложения и настройка глобальных параметров.

#### Основные компоненты:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Глобальный префикс для всех маршрутов
  app.setGlobalPrefix('api');
  
  // Настройка CORS
  app.enableCors({
    origin: true, // Разрешить все источники в разработке
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  // Глобальная валидация
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Удалять свойства, не описанные в DTO
      forbidNonWhitelisted: true, // Запрещать неизвестные свойства
      transform: true, // Автоматически преобразовывать типы
      transformOptions: {
        enableImplicitConversion: true, // Неявное преобразование типов
      },
    }),
  );
  
  // Swagger документация
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Momentum API')
    .setDescription('Habit Tracker API with Teams, Challenges, and Analytics')
    .setVersion('1.0')
    .addBearerAuth(/* ... */)
    .build();
    
  SwaggerModule.setup('api/docs', app, document);
  
  await app.listen(process.env.PORT || 3001);
}
```

#### Параметры конфигурации:

- **Глобальный префикс `api`** - все маршруты доступны по пути `/api/*`
- **CORS** - настроен для работы с фронтендом, разрешены все источники в разработке
- **ValidationPipe** - автоматическая валидация всех входящих данных на основе DTO
- **Swagger** - автоматическая генерация API документации на `/api/docs`

### app.module.ts - Корневой модуль

`AppModule` является корневым модулем приложения, который импортирует все функциональные модули.

#### Структура:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Глобальный модуль конфигурации
    PrismaModule, // Глобальный модуль для работы с БД
    AuthModule,
    UsersModule,
    TeamsModule,
    ChallengesModule,
    HabitsModule,
    HabitLogsModule,
    PostsModule,
    ChatsModule,
    StorageModule,
    UserSettingsModule,
  ],
})
export class AppModule {}
```

#### Особенности:

- **ConfigModule** - глобальный модуль для доступа к переменным окружения через `ConfigService`
- **PrismaModule** - глобальный модуль, экспортирующий `PrismaService` для всех модулей
- Все остальные модули - функциональные модули приложения

---

## Модульная структура NestJS

NestJS использует модульную архитектуру, где каждый модуль инкапсулирует связанную функциональность.

### Структура модуля

Каждый модуль обычно содержит:

1. **Module** (`*.module.ts`) - декларация модуля с импортами, контроллерами и провайдерами
2. **Controller** (`*.controller.ts`) - обработка HTTP-запросов
3. **Service** (`*.service.ts`) - бизнес-логика
4. **DTO** (`dto/*.dto.ts`) - объекты передачи данных для валидации

### Декораторы модулей

- `@Module()` - декоратор для объявления модуля
- `@Global()` - делает модуль глобальным (доступен без импорта)
- `@Injectable()` - декоратор для сервисов, позволяющий использовать DI

### Dependency Injection

NestJS использует систему внедрения зависимостей на основе TypeScript декораторов:

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService, // Автоматически внедряется
  ) {}
}
```

---

## Система аутентификации и авторизации

### Архитектура аутентификации

Система использует **JWT (JSON Web Tokens)** для аутентификации с двумя типами токенов:

1. **Access Token** - короткоживущий токен (15 минут по умолчанию) для доступа к API
2. **Refresh Token** - долгоживущий токен (7 дней по умолчанию) для обновления access token

### AuthModule

#### Структура модуля:

```typescript
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionsService,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  exports: [AuthService, SessionsService],
})
export class AuthModule {}
```

### AuthService - Сервис аутентификации

#### Основные методы:

##### 1. `register(registerDto, userAgent?, ipAddress?)`

Регистрирует нового пользователя в системе.

**Параметры:**
- `registerDto: RegisterDto` - данные регистрации (email, password, nickname)
- `userAgent?: string` - User-Agent браузера для сессии
- `ipAddress?: string` - IP-адрес пользователя

**Логика работы:**
1. Проверяет существование пользователя с таким email или nickname
2. Хеширует пароль с помощью Argon2
3. Создает пользователя в базе данных
4. Генерирует access и refresh токены
5. Создает сессию в базе данных
6. Возвращает данные пользователя и токены

**Возвращает:**
```typescript
{
  user: {
    id: string;
    email: string;
    nickname: string;
    avatarUrl?: string;
    bio?: string;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
```

##### 2. `login(loginDto, userAgent?, ipAddress?)`

Аутентифицирует существующего пользователя.

**Параметры:**
- `loginDto: LoginDto` - данные входа (email, password)
- `userAgent?: string` - User-Agent браузера
- `ipAddress?: string` - IP-адрес пользователя

**Логика работы:**
1. Находит пользователя по email
2. Проверяет пароль с помощью Argon2
3. Генерирует новые токены
4. Создает новую сессию
5. Возвращает данные пользователя и токены

**Исключения:**
- `UnauthorizedException` - если пользователь не найден или пароль неверный

##### 3. `refreshTokens(refreshToken, userAgent?, ipAddress?)`

Обновляет access token используя refresh token.

**Параметры:**
- `refreshToken: string` - текущий refresh token
- `userAgent?: string` - User-Agent браузера
- `ipAddress?: string` - IP-адрес пользователя

**Логика работы:**
1. Верифицирует refresh token
2. Находит сессию по sessionId из токена
3. Проверяет, что сессия не истекла
4. Удаляет старую сессию (ротация токенов)
5. Создает новую сессию с новыми токенами
6. Возвращает новые токены

**Исключения:**
- `UnauthorizedException` - если токен невалиден или сессия истекла

##### 4. `logout(refreshToken)`

Выходит из системы, удаляя сессию.

**Логика работы:**
1. Извлекает sessionId из refresh token
2. Удаляет сессию из базы данных
3. Возвращает сообщение об успешном выходе

##### 5. `logoutAll(userId)`

Выходит из всех устройств пользователя.

**Логика работы:**
1. Удаляет все сессии пользователя
2. Возвращает сообщение об успешном выходе

##### 6. `validateUser(payload: JwtPayload)`

Валидирует пользователя для JWT стратегии.

**Параметры:**
- `payload: JwtPayload` - payload из access token

**Возвращает:**
```typescript
{
  id: string;
  email: string;
  nickname: string;
}
```

#### Приватные методы:

##### `generateTokensAndCreateSession(userId, email, nickname, userAgent?, ipAddress?)`

Генерирует токены и создает сессию.

**Логика:**
1. Создает сессию в БД (с временным refresh token)
2. Генерирует access token с payload: `{ sub, email, nickname }`
3. Генерирует refresh token с payload: `{ sub, sessionId }`
4. Обновляет сессию с реальным refresh token
5. Возвращает оба токена

##### `generateAccessToken(userId, email, nickname)`

Генерирует access token с коротким временем жизни.

##### `generateRefreshToken(userId, sessionId)`

Генерирует refresh token с длинным временем жизни.

##### `calculateExpiration(duration: string)`

Вычисляет дату истечения из строки формата "7d", "15m" и т.д.

### SessionsService - Управление сессиями

Сервис для управления пользовательскими сессиями в базе данных.

#### Основные методы:

##### `create(data: CreateSessionData)`

Создает новую сессию.

**Параметры:**
```typescript
{
  userId: string;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}
```

##### `findById(sessionId: string)`

Находит сессию по ID.

##### `findByIdAndToken(sessionId: string, refreshToken: string)`

Находит сессию по ID и токену (для верификации).

##### `findAllByUserId(userId: string)`

Возвращает все активные сессии пользователя.

**Возвращает:**
```typescript
[
  {
    id: string;
    userAgent?: string;
    ipAddress?: string;
    createdAt: Date;
    expiresAt: Date;
  }
]
```

##### `updateRefreshToken(sessionId: string, refreshToken: string)`

Обновляет refresh token в сессии.

##### `delete(sessionId: string)`

Удаляет сессию (с обработкой ошибок, если сессия не найдена).

##### `deleteAllByUserId(userId: string)`

Удаляет все сессии пользователя.

##### `deleteExpired()`

Удаляет истекшие сессии (для cleanup job).

### JWT Strategies

#### JwtStrategy - Стратегия для Access Token

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Извлечение из заголовка Authorization
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    return this.authService.validateUser(payload);
  }
}
```

**Логика:**
1. Извлекает токен из заголовка `Authorization: Bearer <token>`
2. Верифицирует токен с помощью секрета
3. Вызывает `validate()` с payload
4. Возвращает данные пользователя, которые прикрепляются к `request.user`

#### JwtRefreshStrategy - Стратегия для Refresh Token

```typescript
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'), // Извлечение из тела запроса
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
    });
  }

  async validate(payload: RefreshTokenPayload) {
    return { userId: payload.sub, sessionId: payload.sessionId };
  }
}
```

### AuthController - HTTP обработчик

#### Эндпоинты:

##### `POST /api/auth/register` (Public)

Регистрация нового пользователя.

**Тело запроса:**
```typescript
{
  email: string;
  password: string;
  nickname: string;
}
```

**Ответ:**
```typescript
{
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
```

##### `POST /api/auth/login` (Public)

Вход в систему.

**Тело запроса:**
```typescript
{
  email: string;
  password: string;
}
```

##### `POST /api/auth/refresh` (Public)

Обновление токенов.

**Тело запроса:**
```typescript
{
  refreshToken: string;
}
```

##### `POST /api/auth/logout` (Public)

Выход из системы.

##### `POST /api/auth/logout-all` (Protected)

Выход из всех устройств.

##### `GET /api/auth/sessions` (Protected)

Получение всех активных сессий.

##### `DELETE /api/auth/sessions/:sessionId` (Protected)

Отзыв конкретной сессии.

##### `GET /api/auth/me` (Protected)

Получение текущего аутентифицированного пользователя.

---

## Декораторы и Guards

### Декораторы

#### @Public() - Публичный маршрут

Декоратор для пометки маршрута как публичного (не требующего аутентификации).

**Реализация:**
```typescript
export const IS_PUBLIC_KEY = 'isPublic';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**Использование:**
```typescript
@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

**Принцип работы:**
- Устанавливает метаданные `isPublic: true` на маршрут
- `JwtAuthGuard` проверяет эти метаданные и пропускает запрос без проверки токена

#### @Roles(...roles: TeamRole[]) - Роли команды

Декоратор для указания требуемых ролей команды для доступа к маршруту.

**Реализация:**
```typescript
export const ROLES_KEY = 'roles';

export const Roles = (...roles: TeamRole[]) => SetMetadata(ROLES_KEY, roles);
```

**Использование:**
```typescript
@Roles(TeamRole.ADMIN, TeamRole.OWNER)
@UseGuards(JwtAuthGuard, TeamRolesGuard)
@Delete(':id')
deleteTeam(@Param('id') id: string) {
  // Только админы и владельцы могут удалить
}
```

**Принцип работы:**
- Устанавливает метаданные с массивом требуемых ролей
- `TeamRolesGuard` проверяет роль пользователя в команде

#### @CurrentUser() - Текущий пользователь

Параметрический декоратор для извлечения текущего аутентифицированного пользователя из запроса.

**Реализация:**
```typescript
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
```

**Использование:**
```typescript
// Получить весь объект пользователя
@Get('profile')
getProfile(@CurrentUser() user: AuthenticatedUser) {
  return user;
}

// Получить только ID
@Get('my-id')
getMyId(@CurrentUser('id') userId: string) {
  return userId;
}
```

**Принцип работы:**
- Извлекает `request.user`, который был установлен `JwtAuthGuard`
- Если передан параметр (например, `'id'`), возвращает только это свойство
- Иначе возвращает весь объект пользователя

### Guards

#### JwtAuthGuard - Защита JWT маршрутов

Глобальный guard для защиты маршрутов, требующих аутентификации.

**Реализация:**
```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Пропустить проверку для публичных маршрутов
    }

    return super.canActivate(context); // Вызвать стандартную проверку JWT
  }
}
```

**Принцип работы:**
1. Проверяет метаданные маршрута на наличие `@Public()`
2. Если маршрут публичный - пропускает запрос
3. Иначе вызывает родительский `AuthGuard('jwt')`, который:
   - Извлекает токен из заголовка
   - Верифицирует токен через `JwtStrategy`
   - Прикрепляет данные пользователя к `request.user`

**Глобальное применение:**
Guard может быть применен глобально через `APP_GUARD` в `app.module.ts` или локально через `@UseGuards(JwtAuthGuard)`.

#### TeamRolesGuard - Проверка ролей команды

Guard для проверки роли пользователя в конкретной команде.

**Реализация:**
```typescript
@Injectable()
export class TeamRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Получить требуемые роли из метаданных
    const requiredRoles = this.reflector.getAllAndOverride<TeamRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Если роли не указаны, разрешить доступ
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Получить teamId из параметров маршрута
    const teamId = request.params.teamId;
    if (!teamId) {
      throw new ForbiddenException('Team ID not found in request');
    }

    // Найти роль пользователя в команде
    const teamMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId: user.id },
      },
    });

    if (!teamMember) {
      throw new ForbiddenException('You are not a member of this team');
    }

    // Проверить, есть ли роль пользователя в требуемых ролях
    if (!requiredRoles.includes(teamMember.role)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    // Прикрепить информацию о члене команды к запросу
    request.teamMember = teamMember;

    return true;
  }
}
```

**Принцип работы:**
1. Извлекает требуемые роли из метаданных `@Roles()`
2. Получает `teamId` из параметров маршрута (`:teamId`)
3. Находит запись `TeamMember` в базе данных
4. Проверяет, что роль пользователя входит в список требуемых ролей
5. Прикрепляет `teamMember` к запросу для дальнейшего использования

**Использование:**
```typescript
@Roles(TeamRole.ADMIN, TeamRole.OWNER)
@UseGuards(JwtAuthGuard, TeamRolesGuard)
@Delete(':teamId')
deleteTeam(@Param('teamId') teamId: string) {
  // request.teamMember доступен здесь
}
```

---

## База данных и Prisma ORM

### PrismaService - Сервис базы данных

Глобальный сервис для работы с базой данных через Prisma ORM.

**Реализация:**
```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect(); // Подключение к БД при старте модуля
  }

  async onModuleDestroy() {
    await this.$disconnect(); // Отключение при остановке модуля
  }
}
```

**Особенности:**
- Расширяет `PrismaClient` - автоматически генерируемый клиент Prisma
- Реализует `OnModuleInit` и `OnModuleDestroy` для управления жизненным циклом
- Логирование запросов в режиме разработки

### PrismaModule - Глобальный модуль БД

```typescript
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**Особенности:**
- `@Global()` - делает модуль глобальным, доступным во всех модулях без импорта
- Экспортирует `PrismaService` для использования во всех модулях

### Схема базы данных (schema.prisma)

#### Модель User - Пользователь

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String   @map("password_hash")
  nickname      String   @unique
  avatarUrl     String?  @map("avatar_url")
  bio           String?  @db.Text
  headerBgUrl   String?  @map("header_bg_url")
  nicknameChangedAt DateTime? @map("nickname_changed_at")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  sessions      Session[]
  ownedTeams    Team[]        @relation("TeamOwner")
  teamMembers   TeamMember[]
  habitLogs     HabitLog[]
  messages      Message[]
  posts         Post[]
  dashboard     UserDashboard?
  settings      UserSettings?

  @@map("users")
}
```

**Поля:**
- `id` - UUID, первичный ключ
- `email` - уникальный email пользователя
- `passwordHash` - хеш пароля (Argon2)
- `nickname` - уникальное имя пользователя
- `avatarUrl` - URL аватара
- `bio` - биография пользователя
- `headerBgUrl` - URL фонового изображения профиля
- `nicknameChangedAt` - дата последнего изменения никнейма (для ограничения частоты изменений)
- `createdAt`, `updatedAt` - временные метки

**Связи:**
- `sessions` - все сессии пользователя
- `ownedTeams` - команды, где пользователь является владельцем
- `teamMembers` - членство в командах
- `habitLogs` - логи выполнения привычек
- `messages` - сообщения в чатах
- `posts` - посты в командах
- `dashboard` - конфигурация дашборда (1:1)
- `settings` - настройки пользователя (1:1)

#### Модель Session - Сессия

```prisma
model Session {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  refreshToken String   @map("refresh_token")
  userAgent    String?  @map("user_agent")
  ipAddress    String?  @map("ip_address")
  expiresAt    DateTime @map("expires_at")
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([refreshToken])
  @@map("sessions")
}
```

**Поля:**
- `id` - UUID сессии
- `userId` - ID пользователя
- `refreshToken` - refresh token для этой сессии
- `userAgent` - User-Agent браузера
- `ipAddress` - IP-адрес пользователя
- `expiresAt` - дата истечения сессии
- `createdAt` - дата создания

**Связи:**
- `user` - пользователь, которому принадлежит сессия (CASCADE удаление)

**Индексы:**
- По `userId` - для быстрого поиска сессий пользователя
- По `refreshToken` - для быстрой верификации токена

#### Модель Team - Команда

```prisma
model Team {
  id                    String   @id @default(uuid())
  name                  String
  slogan                String?
  description           String?  @db.Text
  headerBgUrl           String?  @map("header_bg_url")
  ownerId               String   @map("owner_id")
  isPrivate             Boolean  @default(false)
  requireInviteCode     Boolean  @default(false)
  requireEmailWhitelist Boolean  @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  owner           User                 @relation("TeamOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  members         TeamMember[]
  challenges      Challenge[]
  chat            Chat?
  posts           Post[]
  invites         TeamInvite[]
  whitelistEmails TeamWhitelistEmail[]

  @@index([ownerId])
  @@map("teams")
}
```

**Поля:**
- `id` - UUID команды
- `name` - название команды
- `slogan` - слоган команды
- `description` - описание команды
- `headerBgUrl` - URL фонового изображения
- `ownerId` - ID владельца команды
- `isPrivate` - приватная ли команда
- `requireInviteCode` - требуется ли код приглашения для вступления
- `requireEmailWhitelist` - требуется ли email в whitelist для вступления
- `createdAt`, `updatedAt` - временные метки

**Связи:**
- `owner` - владелец команды (CASCADE удаление)
- `members` - члены команды
- `challenges` - челленджи команды
- `chat` - чат команды (1:1)
- `posts` - посты команды
- `invites` - коды приглашений
- `whitelistEmails` - whitelist email-адресов

#### Модель TeamMember - Член команды

```prisma
model TeamMember {
  id       String   @id @default(uuid())
  teamId   String   @map("team_id")
  userId   String   @map("user_id")
  role     TeamRole @default(MEMBER)
  joinedAt DateTime @default(now()) @map("joined_at")

  team     Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([teamId, userId])
  @@index([teamId])
  @@index([userId])
  @@map("team_members")
}
```

**Поля:**
- `id` - UUID записи
- `teamId` - ID команды
- `userId` - ID пользователя
- `role` - роль в команде (MEMBER, ADMIN, OWNER)
- `joinedAt` - дата вступления

**Связи:**
- `team` - команда (CASCADE удаление)
- `user` - пользователь (CASCADE удаление)

**Ограничения:**
- Уникальная пара `[teamId, userId]` - пользователь может быть членом команды только один раз

#### Модель Challenge - Челлендж

```prisma
model Challenge {
  id          String   @id @default(uuid())
  teamId      String   @map("team_id")
  title       String
  description String?  @db.Text
  posterUrl   String?  @map("poster_url")
  startDate   DateTime @map("start_date") @db.Date
  endDate     DateTime @map("end_date") @db.Date
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  team        Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  habits      Habit[]

  @@index([teamId])
  @@index([startDate, endDate])
  @@map("challenges")
}
```

**Поля:**
- `id` - UUID челленджа
- `teamId` - ID команды
- `title` - название челленджа
- `description` - описание
- `posterUrl` - URL постера
- `startDate` - дата начала (только дата)
- `endDate` - дата окончания (только дата)
- `createdAt`, `updatedAt` - временные метки

**Связи:**
- `team` - команда (CASCADE удаление)
- `habits` - привычки в челлендже

#### Модель Habit - Привычка

```prisma
model Habit {
  id          String   @id @default(uuid())
  challengeId String   @map("challenge_id")
  title       String
  description String?  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  challenge   Challenge  @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  logs        HabitLog[]

  @@index([challengeId])
  @@map("habits")
}
```

**Поля:**
- `id` - UUID привычки
- `challengeId` - ID челленджа
- `title` - название привычки
- `description` - описание
- `createdAt`, `updatedAt` - временные метки

**Связи:**
- `challenge` - челлендж (CASCADE удаление)
- `logs` - логи выполнения

#### Модель HabitLog - Лог выполнения привычки

```prisma
model HabitLog {
  id       String         @id @default(uuid())
  habitId  String         @map("habit_id")
  userId   String         @map("user_id")
  date     DateTime       @db.Date
  status   HabitLogStatus
  note     String?        @db.Text
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  habit    Habit          @relation(fields: [habitId], references: [id], onDelete: Cascade)
  user     User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([habitId, userId, date])
  @@index([habitId])
  @@index([userId])
  @@index([date])
  @@map("habit_logs")
}
```

**Поля:**
- `id` - UUID лога
- `habitId` - ID привычки
- `userId` - ID пользователя
- `date` - дата выполнения (только дата)
- `status` - статус (COMPLETED, PARTIAL, SKIPPED_EXCUSED)
- `note` - заметка пользователя
- `createdAt`, `updatedAt` - временные метки

**Связи:**
- `habit` - привычка (CASCADE удаление)
- `user` - пользователь (CASCADE удаление)

**Ограничения:**
- Уникальная комбинация `[habitId, userId, date]` - один лог на пользователя на привычку на дату

**Enum HabitLogStatus:**
```prisma
enum HabitLogStatus {
  COMPLETED        // Полностью выполнено
  PARTIAL          // Частично выполнено
  SKIPPED_EXCUSED  // Пропущено с разрешением (только для админов)
}
```

#### Модель Chat - Чат команды

```prisma
model Chat {
  id        String   @id @default(uuid())
  teamId    String   @unique @map("team_id")
  createdAt DateTime @default(now())

  team      Team      @relation(fields: [teamId], references: [id], onDelete: Cascade)
  messages  Message[]

  @@map("chats")
}
```

**Поля:**
- `id` - UUID чата
- `teamId` - ID команды (уникальный)
- `createdAt` - дата создания

**Связи:**
- `team` - команда (1:1, CASCADE удаление)
- `messages` - сообщения в чате

#### Модель Message - Сообщение

```prisma
model Message {
  id        String   @id @default(uuid())
  chatId    String   @map("chat_id")
  userId    String   @map("user_id")
  content   String   @db.Text
  mediaUrl  String?  @map("media_url")
  createdAt DateTime @default(now())

  chat      Chat     @relation(fields: [chatId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([chatId])
  @@index([userId])
  @@index([createdAt])
  @@map("messages")
}
```

**Поля:**
- `id` - UUID сообщения
- `chatId` - ID чата
- `userId` - ID автора
- `content` - текст сообщения
- `mediaUrl` - URL медиафайла
- `createdAt` - дата создания

**Связи:**
- `chat` - чат (CASCADE удаление)
- `user` - автор (CASCADE удаление)

#### Модель Post - Пост команды

```prisma
model Post {
  id        String   @id @default(uuid())
  teamId    String   @map("team_id")
  authorId  String   @map("author_id")
  title     String
  content   String   @db.Text
  mediaUrls Json     @default("[]") @map("media_urls") @db.JsonB
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([teamId])
  @@index([authorId])
  @@index([createdAt])
  @@map("posts")
}
```

**Поля:**
- `id` - UUID поста
- `teamId` - ID команды
- `authorId` - ID автора
- `title` - заголовок
- `content` - содержимое
- `mediaUrls` - массив URL медиафайлов (JSON)
- `createdAt`, `updatedAt` - временные метки

**Связи:**
- `team` - команда (CASCADE удаление)
- `author` - автор (CASCADE удаление)

#### Модель UserDashboard - Дашборд пользователя

```prisma
model UserDashboard {
  id           String   @id @default(uuid())
  userId       String   @unique @map("user_id")
  layoutConfig Json     @default("[]") @map("layout_config") @db.JsonB
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_dashboards")
}
```

**Поля:**
- `id` - UUID дашборда
- `userId` - ID пользователя (уникальный, 1:1)
- `layoutConfig` - конфигурация расположения виджетов (JSON)
- `createdAt`, `updatedAt` - временные метки

**Связи:**
- `user` - пользователь (1:1, CASCADE удаление)

#### Модель UserSettings - Настройки пользователя

```prisma
model UserSettings {
  id        String   @id @default(uuid())
  userId    String   @unique @map("user_id")
  settings  Json     @map("settings") @db.JsonB
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_settings")
}
```

**Поля:**
- `id` - UUID настроек
- `userId` - ID пользователя (уникальный, 1:1)
- `settings` - JSON объект с настройками
- `createdAt`, `updatedAt` - временные метки

**Связи:**
- `user` - пользователь (1:1, CASCADE удаление)

#### Модель TeamInvite - Код приглашения

```prisma
model TeamInvite {
  id        String    @id @default(uuid())
  teamId    String    @map("team_id")
  code      String    @unique
  maxUses   Int?      @map("max_uses")
  usedCount Int       @default(0) @map("used_count")
  expiresAt DateTime? @map("expires_at")
  isActive  Boolean   @default(true) @map("is_active")
  createdBy String    @map("created_by")
  createdAt DateTime  @default(now())

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@index([teamId])
  @@index([code])
  @@map("team_invites")
}
```

**Поля:**
- `id` - UUID приглашения
- `teamId` - ID команды
- `code` - уникальный код приглашения
- `maxUses` - максимальное количество использований (null = без ограничений)
- `usedCount` - количество использований
- `expiresAt` - дата истечения (null = без срока)
- `isActive` - активен ли код
- `createdBy` - ID создателя
- `createdAt` - дата создания

**Связи:**
- `team` - команда (CASCADE удаление)

#### Модель TeamWhitelistEmail - Whitelist email

```prisma
model TeamWhitelistEmail {
  id        String   @id @default(uuid())
  teamId    String   @map("team_id")
  email     String
  createdAt DateTime @default(now())

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@unique([teamId, email])
  @@index([teamId])
  @@index([email])
  @@map("team_whitelist_emails")
}
```

**Поля:**
- `id` - UUID записи
- `teamId` - ID команды
- `email` - email адрес
- `createdAt` - дата добавления

**Связи:**
- `team` - команда (CASCADE удаление)

**Ограничения:**
- Уникальная пара `[teamId, email]` - один email на команду

### Enums

#### TeamRole

```prisma
enum TeamRole {
  MEMBER  // Обычный член команды
  ADMIN   // Администратор команды
  OWNER   // Владелец команды
}
```

---

## Модули приложения

### UsersModule - Управление пользователями

#### UsersService

##### `findById(userId: string)`

Находит пользователя по ID, исключая чувствительные поля.

**Возвращает:**
```typescript
{
  id: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
  bio?: string;
  headerBgUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

##### `findByNickname(nickname: string)`

Находит публичный профиль пользователя по никнейму.

##### `updateProfile(userId: string, updateProfileDto: UpdateProfileDto)`

Обновляет профиль пользователя.

**Особенности:**
- Проверяет уникальность никнейма
- Ограничивает частоту изменения никнейма (раз в 30 дней)
- Обновляет `nicknameChangedAt` при изменении никнейма

##### `changePassword(userId: string, changePasswordDto: ChangePasswordDto)`

Изменяет пароль пользователя.

**Логика:**
1. Проверяет текущий пароль
2. Хеширует новый пароль
3. Обновляет `passwordHash` в базе

##### `getDashboard(userId: string)`

Получает конфигурацию дашборда пользователя.

**Особенности:**
- Создает дефолтный дашборд, если не существует

##### `updateDashboard(userId: string, updateDashboardDto: UpdateDashboardDto)`

Обновляет конфигурацию дашборда.

##### `getStatistics(userId: string)`

Получает статистику пользователя.

**Возвращает:**
```typescript
{
  teamsCount: number;
  completedHabitsCount: number;
  challengesCount: number;
  currentStreak: number;
}
```

**Логика расчета streak:**
- Находит все логи со статусом COMPLETED
- Группирует по датам
- Считает последовательные дни начиная со вчерашнего дня

#### UsersController

- `GET /api/users/profile` - текущий профиль
- `PATCH /api/users/profile` - обновление профиля
- `PATCH /api/users/password` - изменение пароля
- `GET /api/users/dashboard` - конфигурация дашборда
- `PATCH /api/users/dashboard` - обновление дашборда
- `GET /api/users/statistics` - статистика пользователя
- `GET /api/users/:nickname` (Public) - публичный профиль

### TeamsModule - Управление командами

#### TeamsService

##### `create(userId: string, createTeamDto: CreateTeamDto)`

Создает новую команду.

**Логика:**
1. Создает команду с указанным владельцем
2. Автоматически добавляет создателя как OWNER в `TeamMember`
3. Создает чат для команды
4. Возвращает команду с полной информацией

##### `findAll(userId?: string, includePrivate = false)`

Находит все команды.

**Логика:**
- Если `userId` указан и `includePrivate = true`, включает приватные команды, где пользователь является членом
- Иначе возвращает только публичные команды

##### `findUserTeams(userId: string)`

Находит все команды, где пользователь является членом.

##### `findById(teamId: string, userId?: string)`

Находит команду по ID.

**Логика:**
- Если команда приватная и `userId` не указан или пользователь не является членом - выбрасывает `ForbiddenException`

##### `update(teamId: string, userId: string, updateTeamDto: UpdateTeamDto)`

Обновляет настройки команды.

**Требования:**
- Пользователь должен быть ADMIN или OWNER

##### `delete(teamId: string, userId: string)`

Удаляет команду.

**Требования:**
- Только владелец может удалить команду

##### `join(teamId: string, userId: string, userEmail?: string)`

Присоединяет пользователя к публичной команде.

**Логика:**
1. Проверяет, что команда не приватная
2. Проверяет, что не требуется код приглашения
3. Проверяет whitelist email, если требуется
4. Создает запись `TeamMember` с ролью MEMBER

##### `leave(teamId: string, userId: string)`

Покидает команду.

**Ограничения:**
- Владелец не может покинуть команду (нужно передать владение или удалить команду)

##### `getStatistics(teamId: string)`

Получает статистику команды.

**Возвращает:**
```typescript
{
  membersCount: number;
  challengesCount: number;
  activeChallenges: number;
  totalCompletedHabits: number;
}
```

#### TeamMembersService

##### `getMemberRole(teamId: string, userId: string)`

Получает роль пользователя в команде.

##### `isMember(teamId: string, userId: string)`

Проверяет, является ли пользователь членом команды.

##### `isAdminOrOwner(teamId: string, userId: string)`

Проверяет, является ли пользователь админом или владельцем.

##### `getMembers(teamId: string)`

Получает всех членов команды, отсортированных по роли и дате вступления.

##### `updateRole(teamId: string, targetUserId: string, newRole: TeamRole, requesterId: string)`

Изменяет роль члена команды.

**Требования:**
- Только OWNER может изменять роли
- Нельзя изменить роль владельца команды
- Нельзя сделать кого-то владельцем через этот метод (используйте `transferOwnership`)

##### `removeMember(teamId: string, targetUserId: string, requesterId: string)`

Удаляет члена из команды.

**Требования:**
- Только ADMIN и OWNER могут удалять членов
- Нельзя удалить владельца
- ADMIN не может удалить другого ADMIN (только OWNER)

##### `transferOwnership(teamId: string, newOwnerId: string, currentOwnerId: string)`

Передает владение командой другому члену.

**Логика:**
1. Проверяет, что текущий пользователь - владелец
2. Проверяет, что новый владелец - член команды
3. Обновляет `Team.ownerId`
4. Устанавливает роль нового владельца как OWNER
5. Понижает старого владельца до ADMIN

#### TeamInvitesService

##### `createInvite(teamId: string, userId: string, createInviteDto: CreateTeamInviteDto)`

Создает новый код приглашения.

**Логика:**
1. Проверяет права (ADMIN или OWNER)
2. Генерирует уникальный 6-символьный код (A-Z, 2-9, исключая похожие символы)
3. Создает запись `TeamInvite`

**Параметры:**
```typescript
{
  maxUses?: number;      // Максимальное количество использований
  expiresAt?: string;   // Дата истечения
}
```

##### `validateInviteCode(code: string)`

Валидирует код приглашения и возвращает информацию о команде.

**Проверки:**
- Код существует
- Код активен
- Код не истек
- Код не достиг максимального количества использований

##### `joinWithInviteCode(code: string, userId: string, userEmail: string)`

Присоединяет пользователя к команде по коду приглашения.

**Логика:**
1. Валидирует код
2. Проверяет whitelist email, если требуется
3. Создает `TeamMember`
4. Увеличивает `usedCount` в `TeamInvite`

##### `deactivateInvite(teamId: string, inviteId: string, userId: string)`

Деактивирует код приглашения.

##### `deleteInvite(teamId: string, inviteId: string, userId: string)`

Удаляет код приглашения.

#### TeamWhitelistService

##### `getWhitelistEmails(teamId: string, userId: string)`

Получает все email из whitelist.

##### `addWhitelistEmail(teamId: string, email: string, userId: string)`

Добавляет email в whitelist.

##### `addBulkWhitelistEmails(teamId: string, emails: string[], userId: string)`

Добавляет несколько email в whitelist.

**Возвращает:**
```typescript
{
  added: number;
  skipped: number;
  total: number;
}
```

##### `removeWhitelistEmail(teamId: string, whitelistId: string, userId: string)`

Удаляет email из whitelist.

#### TeamsController

- `POST /api/teams` - создание команды
- `GET /api/teams` (Public) - все публичные команды
- `GET /api/teams/my` - команды пользователя
- `GET /api/teams/:teamId` (Public) - команда по ID
- `PATCH /api/teams/:teamId` - обновление команды
- `DELETE /api/teams/:teamId` - удаление команды
- `POST /api/teams/:teamId/join` - присоединение к команде
- `POST /api/teams/:teamId/leave` - покидание команды
- `GET /api/teams/:teamId/statistics` - статистика команды
- `GET /api/teams/:teamId/members` - члены команды
- `PATCH /api/teams/:teamId/members/:userId/role` - изменение роли
- `DELETE /api/teams/:teamId/members/:userId` - удаление члена
- `POST /api/teams/:teamId/transfer-ownership` - передача владения
- `GET /api/teams/:teamId/members/:userId/statistics` - статистика члена
- `POST /api/teams/:teamId/invites` - создание кода приглашения
- `GET /api/teams/:teamId/invites` - коды приглашений команды
- `GET /api/teams/invite/:code/validate` (Public) - валидация кода
- `POST /api/teams/invite/:code/join` - присоединение по коду
- `PATCH /api/teams/:teamId/invites/:inviteId/deactivate` - деактивация кода
- `DELETE /api/teams/:teamId/invites/:inviteId` - удаление кода
- `GET /api/teams/:teamId/whitelist` - whitelist email
- `POST /api/teams/:teamId/whitelist` - добавление email
- `POST /api/teams/:teamId/whitelist/bulk` - массовое добавление email
- `DELETE /api/teams/:teamId/whitelist/:whitelistId` - удаление email

### ChallengesModule - Управление челленджами

#### ChallengesService

##### `create(teamId: string, userId: string, createChallengeDto: CreateChallengeDto)`

Создает новый челлендж.

**Требования:**
- Пользователь должен быть ADMIN или OWNER команды

**Валидация:**
- `endDate` должен быть после `startDate`

##### `findAllByTeam(teamId: string, status?: 'active' | 'upcoming' | 'past')`

Находит все челленджи команды с опциональной фильтрацией по статусу.

**Фильтры:**
- `active` - текущие челленджи (startDate <= now <= endDate)
- `upcoming` - будущие челленджи (startDate > now)
- `past` - прошедшие челленджи (endDate < now)

##### `findById(challengeId: string)`

Находит челлендж по ID с полной информацией.

##### `update(challengeId: string, userId: string, updateChallengeDto: UpdateChallengeDto)`

Обновляет челлендж.

**Требования:**
- Пользователь должен быть ADMIN или OWNER команды

##### `delete(challengeId: string, userId: string)`

Удаляет челлендж.

**Требования:**
- Пользователь должен быть ADMIN или OWNER команды

##### `getStatistics(challengeId: string)`

Получает статистику челленджа.

**Возвращает:**
```typescript
{
  challengeId: string;
  totalDays: number;
  daysElapsed: number;
  habitsCount: number;
  participantsCount: number;
  totalLogs: number;
  completedLogs: number;
  partialLogs: number;
  skippedLogs: number;
  completionRate: number; // Процент выполнения
}
```

**Логика расчета:**
- `expectedLogs = membersCount * habitsCount * daysElapsed`
- `completionRate = (completedLogs / expectedLogs) * 100`

##### `getLeaderboard(challengeId: string)`

Получает таблицу лидеров челленджа.

**Возвращает:**
```typescript
[
  {
    rank: number;
    user: User;
    completedCount: number;
    partialCount: number;
    score: number; // completedCount + partialCount * 0.5
  }
]
```

#### ChallengesController

- `POST /api/challenges` - создание челленджа
- `GET /api/challenges/team/:teamId` - челленджи команды
- `GET /api/challenges/:challengeId` - челлендж по ID
- `PATCH /api/challenges/:challengeId` - обновление челленджа
- `DELETE /api/challenges/:challengeId` - удаление челленджа
- `GET /api/challenges/:challengeId/statistics` - статистика
- `GET /api/challenges/:challengeId/leaderboard` - таблица лидеров

### HabitsModule - Управление привычками

#### HabitsService

##### `create(challengeId: string, userId: string, createHabitDto: CreateHabitDto)`

Создает новую привычку в челлендже.

**Требования:**
- Пользователь должен быть ADMIN или OWNER команды

##### `findAllByChallenge(challengeId: string)`

Находит все привычки челленджа.

##### `findById(habitId: string)`

Находит привычку по ID.

##### `update(habitId: string, userId: string, updateHabitDto: UpdateHabitDto)`

Обновляет привычку.

**Требования:**
- Пользователь должен быть ADMIN или OWNER команды

##### `delete(habitId: string, userId: string)`

Удаляет привычку.

**Требования:**
- Пользователь должен быть ADMIN или OWNER команды

##### `getStatistics(habitId: string)`

Получает статистику привычки.

**Возвращает:**
```typescript
{
  habitId: string;
  completedCount: number;
  partialCount: number;
  skippedCount: number;
  totalLogs: number;
  participantsCount: number;
  daysElapsed: number;
  expectedCompletions: number;
  completionRate: number;
}
```

##### `getLeaderboard(habitId: string)`

Получает таблицу лидеров для конкретной привычки.

**Особенности:**
- Включает расчет текущего streak для каждого пользователя

#### HabitsController

- `POST /api/habits` - создание привычки
- `GET /api/habits/challenge/:challengeId` - привычки челленджа
- `GET /api/habits/:habitId` - привычка по ID
- `PATCH /api/habits/:habitId` - обновление привычки
- `DELETE /api/habits/:habitId` - удаление привычки
- `GET /api/habits/:habitId/statistics` - статистика
- `GET /api/habits/:habitId/leaderboard` - таблица лидеров

### HabitLogsModule - Управление логами привычек

#### HabitLogsService

##### `createOrUpdate(userId: string, createHabitLogDto: CreateHabitLogDto)`

Создает или обновляет лог выполнения привычки.

**Параметры:**
```typescript
{
  habitId: string;
  date: string; // ISO date string
  status: HabitLogStatus;
  note?: string;
  targetUserId?: string; // Для админов: логирование за другого пользователя
}
```

**Логика:**
1. Проверяет, что дата в пределах периода челленджа
2. Если `targetUserId` указан:
   - Проверяет права (только ADMIN/OWNER)
   - Для статуса SKIPPED_EXCUSED разрешено логирование за других
   - Для COMPLETED/PARTIAL - только за себя
3. Если `targetUserId` не указан:
   - Проверяет членство в команде
   - MEMBER не может ставить SKIPPED_EXCUSED для себя
4. Выполняет upsert (создает или обновляет существующий лог)

**Ограничения:**
- Один лог на пользователя на привычку на дату (уникальный ключ)

##### `delete(logId: string, userId: string)`

Удаляет лог.

**Требования:**
- Пользователь может удалить только свой лог
- ADMIN/OWNER может удалить любой лог в своей команде

##### `findByHabitAndUser(habitId: string, userId: string, startDate?: string, endDate?: string)`

Находит логи пользователя для конкретной привычки в диапазоне дат.

##### `findByChallengeForTable(challengeId: string, targetUserId?: string)`

Находит все логи челленджа, организованные для отображения в таблице.

**Возвращает:**
```typescript
{
  challenge: Challenge;
  habits: Habit[];
  members: User[];
  logs: Record<habitId, Record<date, Record<userId, HabitLog>>>;
  targetUser: string | null;
}
```

**Структура logs:**
- Ключ первого уровня - `habitId`
- Ключ второго уровня - дата (ISO string)
- Ключ третьего уровня - `userId`
- Значение - объект `HabitLog`

##### `bulkUpdate(userId: string, bulkUpdateDto: BulkUpdateHabitLogsDto)`

Массовое обновление логов.

**Параметры:**
```typescript
{
  logs: Array<{
    habitId: string;
    date: string;
    status: HabitLogStatus;
    note?: string;
    targetUserId?: string;
  }>;
}
```

**Возвращает:**
```typescript
[
  { success: true, data: HabitLog },
  { success: false, habitId: string, date: string, error: string }
]
```

##### `getTodayHabits(userId: string)`

Получает все привычки, которые нужно выполнить сегодня.

**Логика:**
1. Находит все активные челленджи, где пользователь является членом
2. Находит все привычки этих челленджей
3. Находит логи за сегодня
4. Возвращает список привычек с их статусом

**Возвращает:**
```typescript
[
  {
    habit: Habit;
    challenge: Challenge;
    team: Team;
    status: HabitLogStatus | null;
    logId: string | null;
  }
]
```

##### `getUserHistory(userId: string, days = 30)`

Получает историю выполнения привычек пользователя.

**Возвращает:**
```typescript
{
  logs: HabitLog[];
  dailyStats: Record<date, {
    completed: number;
    partial: number;
    total: number;
  }>;
  summary: {
    totalLogs: number;
    completedCount: number;
    partialCount: number;
    skippedCount: number;
  };
}
```

#### HabitLogsController

- `POST /api/habit-logs` - создание/обновление лога
- `DELETE /api/habit-logs/:logId` - удаление лога
- `GET /api/habit-logs/habit/:habitId/user/:userId` - логи пользователя для привычки
- `GET /api/habit-logs/challenge/:challengeId/table` - логи для таблицы
- `POST /api/habit-logs/bulk` - массовое обновление
- `GET /api/habit-logs/today` - сегодняшние привычки
- `GET /api/habit-logs/history` - история пользователя

### PostsModule - Управление постами

#### PostsService

##### `create(teamId: string, userId: string, createPostDto: CreatePostDto)`

Создает новый пост в команде.

**Требования:**
- Пользователь должен быть членом команды

##### `findAllByTeam(teamId: string, userId?: string)`

Находит все посты команды.

**Требования:**
- Если `userId` указан, проверяет членство

##### `findById(postId: string, userId?: string)`

Находит пост по ID.

##### `update(postId: string, userId: string, updatePostDto: UpdatePostDto)`

Обновляет пост.

**Требования:**
- Автор поста или ADMIN/OWNER команды

##### `delete(postId: string, userId: string)`

Удаляет пост.

**Требования:**
- Автор поста или ADMIN/OWNER команды

#### PostsController

- `POST /api/posts` - создание поста
- `GET /api/posts/team/:teamId` - посты команды
- `GET /api/posts/:postId` - пост по ID
- `PATCH /api/posts/:postId` - обновление поста
- `DELETE /api/posts/:postId` - удаление поста

### ChatsModule - Управление чатами

#### ChatsService

##### `getOrCreateChat(teamId: string)`

Получает или создает чат для команды.

**Особенности:**
- Каждая команда имеет один чат (1:1 связь)

##### `getChatByTeam(teamId: string, userId?: string)`

Получает чат команды.

**Требования:**
- Если `userId` указан, проверяет членство

##### `getMessages(teamId: string, userId?: string, limit = 50, cursor?: string)`

Получает сообщения чата с пагинацией.

**Параметры:**
- `limit` - количество сообщений
- `cursor` - ID последнего полученного сообщения (для курсорной пагинации)

**Логика:**
- Возвращает последние `limit` сообщений до `cursor`
- Сообщения отсортированы по дате создания (новые первыми)
- Результат переворачивается для отображения (старые первыми)

##### `createMessage(teamId: string, userId: string, createMessageDto: CreateMessageDto)`

Создает новое сообщение.

**Требования:**
- Пользователь должен быть членом команды

##### `deleteMessage(messageId: string, userId: string)`

Удаляет сообщение.

**Требования:**
- Автор сообщения или ADMIN/OWNER команды

#### ChatsController

- `GET /api/chats/team/:teamId` - получение чата
- `GET /api/chats/team/:teamId/messages` - сообщения чата
- `POST /api/chats/team/:teamId/messages` - создание сообщения
- `DELETE /api/chats/messages/:messageId` - удаление сообщения

### StorageModule - Управление файлами

#### StorageService

Сервис для работы с MinIO (S3-совместимое хранилище).

##### `onModuleInit()`

Инициализация при старте модуля:
- Проверяет существование bucket
- Создает bucket, если не существует
- Устанавливает политику публичного чтения

##### `uploadFile(file: Buffer, originalName: string, mimeType: string, folder: string)`

Загружает файл в хранилище.

**Валидация:**
- Разрешенные типы: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Максимальный размер: 5MB

**Логика:**
1. Валидирует тип и размер файла
2. Генерирует уникальное имя файла: `${folder}/${uuid}.${extension}`
3. Загружает в MinIO
4. Возвращает публичный URL

##### `getPresignedUploadUrl(fileName: string, folder: string, expirySeconds = 3600)`

Генерирует presigned URL для прямой загрузки с клиента.

**Возвращает:**
```typescript
{
  uploadUrl: string;  // URL для загрузки
  fileUrl: string;    // Публичный URL файла после загрузки
}
```

##### `deleteFile(fileUrl: string)`

Удаляет файл из хранилища.

##### `getPresignedDownloadUrl(objectName: string, expirySeconds = 3600)`

Генерирует presigned URL для скачивания файла.

#### StorageController

- `POST /api/storage/upload` - загрузка файла
- `POST /api/storage/presigned-url` - получение presigned URL
- `DELETE /api/storage` - удаление файла

### UserSettingsModule - Настройки пользователя

#### UserSettingsService

##### `getUserSettings(userId: string)`

Получает настройки пользователя.

**Особенности:**
- Создает дефолтные настройки, если не существуют

**Дефолтные настройки:**
```typescript
{
  theme: 'system';
  language: 'en';
  widgets: [];
  background: {
    type: 'color';
    value: 'dynamic';
    shape: 'torus';
    imageUrl: '/background.jpeg';
  };
  ui: {
    teamChallenges: [];
  };
}
```

##### `updateUserSettings(userId: string, payload: UserSettingsPayload)`

Обновляет настройки пользователя.

**Структура настроек:**
```typescript
{
  theme: 'light' | 'dark' | 'system';
  language: string;
  widgets: Array<{
    id: string;
    location: 'placeholder' | 'workspace' | 'dock';
    placeholderSlot?: number;
    x: number;
    y: number;
  }>;
  background: {
    type: 'color' | 'image';
    value: string;
    shape?: 'torus' | 'cube' | 'pyramid' | 'sphere';
    imageUrl?: string;
  };
  ui?: {
    teamChallenges?: Array<{
      teamId: string;
      recentChallengeIds: string[];
    }>;
  };
}
```

#### UserSettingsController

- `GET /api/user-settings` - получение настроек
- `PATCH /api/user-settings` - обновление настроек

---

## Взаимодействие между сервисами

### Паттерн Service Layer

Все бизнес-логика находится в сервисах, контроллеры только обрабатывают HTTP-запросы.

**Пример взаимодействия:**

```typescript
// Controller
@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly teamMembersService: TeamMembersService,
  ) {}

  @Post(':teamId/members/:userId/role')
  async updateMemberRole(
    @Param('teamId') teamId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
  ) {
    // Controller только передает данные в Service
    return this.teamMembersService.updateRole(
      teamId,
      targetUserId,
      updateMemberRoleDto.role,
      user.id,
    );
  }
}
```

### Использование других сервисов

Сервисы могут использовать другие сервисы через dependency injection:

```typescript
@Injectable()
export class HabitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamMembersService: TeamMembersService, // Использование другого сервиса
  ) {}

  async create(challengeId: string, userId: string, createHabitDto: CreateHabitDto) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    // Использование метода другого сервиса
    const isAdmin = await this.teamMembersService.isAdminOrOwner(
      challenge.teamId,
      userId,
    );

    if (!isAdmin) {
      throw new ForbiddenException('Only admins and owners can create habits');
    }

    // ...
  }
}
```

### Транзакции

Для атомарных операций используются транзакции Prisma:

```typescript
await this.prisma.$transaction([
  this.prisma.teamMember.create({ /* ... */ }),
  this.prisma.teamInvite.update({ /* ... */ }),
]);
```

### Обработка ошибок

Все сервисы используют стандартные исключения NestJS:

- `NotFoundException` - ресурс не найден
- `ForbiddenException` - недостаточно прав
- `ConflictException` - конфликт (например, дубликат)
- `BadRequestException` - неверный запрос
- `UnauthorizedException` - не аутентифицирован

---

## Система валидации и DTO

### DTO (Data Transfer Objects)

DTO используются для валидации входящих данных и типизации.

#### Пример DTO:

```typescript
export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  slogan?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  headerBgUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;
}
```

### Декораторы валидации

- `@IsString()` - строка
- `@IsNotEmpty()` - не пустое
- `@IsOptional()` - опциональное поле
- `@MinLength(n)` - минимальная длина
- `@MaxLength(n)` - максимальная длина
- `@IsEmail()` - email
- `@IsUrl()` - URL
- `@IsBoolean()` - булево значение
- `@IsEnum()` - значение из enum
- `@IsDateString()` - дата в формате ISO

### Глобальная валидация

`ValidationPipe` в `main.ts` автоматически валидирует все входящие данные:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Удаляет свойства, не описанные в DTO
    forbidNonWhitelisted: true, // Запрещает неизвестные свойства
    transform: true, // Преобразует типы автоматически
  }),
);
```

---

## Хранилище файлов

### MinIO

MinIO - это S3-совместимое объектное хранилище, используемое для хранения файлов (аватары, постеры, медиа в сообщениях и постах).

### Конфигурация

Переменные окружения:
- `MINIO_ENDPOINT` - адрес MinIO сервера
- `MINIO_PORT` - порт MinIO
- `MINIO_USE_SSL` - использовать ли SSL
- `MINIO_ACCESS_KEY` - ключ доступа
- `MINIO_SECRET_KEY` - секретный ключ
- `MINIO_BUCKET` - имя bucket

### Структура хранения

Файлы организованы по папкам:
- `avatars/` - аватары пользователей
- `headers/` - фоновые изображения профилей и команд
- `posters/` - постеры челленджей
- `chat-media/` - медиафайлы в сообщениях
- `post-media/` - медиафайлы в постах

### Presigned URLs

Для прямой загрузки с клиента используются presigned URLs:
1. Клиент запрашивает presigned URL у сервера
2. Сервер генерирует временный URL с правами на запись
3. Клиент загружает файл напрямую в MinIO
4. После загрузки файл доступен по публичному URL

---

## Заключение

Сервер Momentum построен на современных технологиях и следует лучшим практикам разработки:

- **Модульная архитектура** - легко расширять и поддерживать
- **Типобезопасность** - TypeScript и Prisma обеспечивают типобезопасность
- **Безопасность** - JWT аутентификация, хеширование паролей, валидация данных
- **Масштабируемость** - модульная структура позволяет легко добавлять новые функции
- **Документация** - Swagger автоматически генерирует API документацию
- **Валидация** - автоматическая валидация всех входящих данных
- **Обработка ошибок** - стандартизированные HTTP исключения

Архитектура обеспечивает разделение ответственности, тестируемость и поддерживаемость кода.








## 2.4 Описание информационных объектов и ограничений целостности

### Таблица 2.1 – Структура таблицы «users»

| Название столбца | Тип, ограничение целостности | Описание столбца |
|------------------|------------------------------|------------------|
| id | uuid, primary key, default uuid_generate_v4() | Уникальный идентификатор пользователя |
| email | varchar(255), unique, not null | Адрес электронной почты пользователя |
| password_hash | varchar(255), not null | Хеш пароля, вычисленный с использованием алгоритма Argon2 |
| nickname | varchar(30), unique, not null | Отображаемое имя пользователя |
| avatar_url | varchar(500) | URL изображения аватара пользователя |
| bio | text | Краткая биография или описание пользователя |
| header_bg_url | varchar(500) | URL фонового изображения профиля пользователя |
| nickname_changed_at | timestamp | Дата последнего изменения никнейма |
| created_at | timestamp, not null, default now() | Дата и время создания записи |
| updated_at | timestamp, not null, default now() | Дата и время последнего обновления записи |

### Таблица 2.2 – Структура таблицы «sessions»

| Название столбца | Тип, ограничение целостности | Описание столбца |
|------------------|------------------------------|------------------|
| id | uuid, primary key, default uuid_generate_v4() | Уникальный идентификатор сессии |
| user_id | uuid, not null, foreign key references users(id) on delete cascade | Идентификатор пользователя, которому принадлежит сессия |
| refresh_token | varchar(500), not null | Refresh token для данной сессии |
| user_agent | varchar(500) | User-Agent браузера для идентификации устройства |
| ip_address | varchar(45) | IP-адрес пользователя |
| expires_at | timestamp, not null | Дата и время истечения сессии |
| created_at | timestamp, not null, default now() | Дата и время создания сессии |

**Индексы:** user_id, refresh_token

### Таблица 2.3 – Структура таблицы «teams»

| Название столбца | Тип, ограничение целостности | Описание столбца |
|------------------|------------------------------|------------------|
| id | uuid, primary key, default uuid_generate_v4() | Уникальный идентификатор команды |
| name | varchar(50), not null | Название команды |
| slogan | varchar(100) | Краткий слоган команды |
| description | text | Подробное описание команды |
| header_bg_url | varchar(500) | URL фонового изображения команды |
| owner_id | uuid, not null, foreign key references users(id) on delete cascade | Идентификатор владельца команды |
| is_private | boolean, not null, default false | Признак приватности команды |
| require_invite_code | boolean, not null, default false | Требование кода приглашения для вступления |
| require_email_whitelist | boolean, not null, default false | Требование наличия email в whitelist для вступления |
| created_at | timestamp, not null, default now() | Дата и время создания команды |
| updated_at | timestamp, not null, default now() | Дата и время последнего обновления команды |

**Индексы:** owner_id

### Таблица 2.4 – Структура таблицы «team_members»

| Название столбца | Тип, ограничение целостности | Описание столбца |
|------------------|------------------------------|------------------|
| id | uuid, primary key, default uuid_generate_v4() | Уникальный идентификатор записи о членстве |
| team_id | uuid, not null, foreign key references teams(id) on delete cascade | Идентификатор команды |
| user_id | uuid, not null, foreign key references users(id) on delete cascade | Идентификатор пользователя |
| role | enum('MEMBER', 'ADMIN', 'OWNER'), not null, default 'MEMBER' | Роль пользователя в команде |
| joined_at | timestamp, not null, default now() | Дата и время вступления в команду |

**Ограничения:** unique(team_id, user_id)

**Индексы:** team_id, user_id

### Таблица 2.5 – Структура таблицы «team_invites»

| Название столбца | Тип, ограничение целостности | Описание столбца |
|------------------|------------------------------|------------------|
| id | uuid, primary key, default uuid_generate_v4() | Уникальный идентификатор кода приглашения |
| team_id | uuid, not null, foreign key references teams(id) on delete cascade | Идентификатор команды |
| code | varchar(6), unique, not null | Уникальный шестисимвольный код приглашения |
| max_uses | integer | Максимальное количество использований кода |
| used_count | integer, not null, default 0 | Фактическое количество использований кода |
| expires_at | timestamp | Дата и время истечения кода |
| is_active | boolean, not null, default true | Признак активности кода |
| created_by | uuid, not null | Идентификатор пользователя, создавшего код |
| created_at | timestamp, not null, default now() | Дата и время создания кода |

**Индексы:** team_id, code

### Таблица 2.6 – Структура таблицы «team_whitelist_emails»

| Название столбца | Тип, ограничение целостности | Описание столбца |
|------------------|------------------------------|------------------|
| id | uuid, primary key, default uuid_generate_v4() | Уникальный идентификатор записи whitelist |
| team_id | uuid, not null, foreign key references teams(id) on delete cascade | Идентификатор команды |
| email | varchar(255), not null | Разрешенный email-адрес |
| created_at | timestamp, not null, default now() | Дата и время добавления email в whitelist |

**Ограничения:** unique(team_id, email)

**Индексы:** team_id, email

### Таблица 2.7 – Структура таблицы «challenges»

| Название столбца | Тип, ограничение целостности | Описание столбца |
|------------------|------------------------------|------------------|
| id | uuid, primary key, default uuid_generate_v4() | Уникальный идентификатор челленджа |
| team_id | uuid, not null, foreign key references teams(id) on delete cascade | Идентификатор команды |
| title | varchar(100), not null | Название челленджа |
| description | text | Подробное описание целей и правил челленджа |
| poster_url | varchar(500) | URL постера челленджа |
| start_date | date, not null | Дата начала челленджа |
| end_date | date, not null | Дата окончания челленджа |
| created_at | timestamp, not null, default now() | Дата и время создания челленджа |
| updated_at | timestamp, not null, default now() | Дата и время последнего обновления челленджа |

**Индексы:** team_id, (start_date, end_date)

### Таблица 2.8 – Структура таблицы «habits»

| Название столбца | Тип, ограничение целостности | Описание столбца |
|------------------|------------------------------|------------------|
| id | uuid, primary key, default uuid_generate_v4() | Уникальный идентификатор привычки |
| challenge_id | uuid, not null, foreign key references challenges(id) on delete cascade | Идентификатор челленджа |
| title | varchar(100), not null | Название привычки |
| description | text | Подробное описание привычки, критерии выполнения |
| created_at | timestamp, not null, default now() | Дата и время создания привычки |
| updated_at | timestamp, not null, default now() | Дата и время последнего обновления привычки |

**Индексы:** challenge_id

### Таблица 2.9 – Структура таблицы «habit_logs»

| Название столбца | Тип, ограничение целостности | Описание столбца |
|------------------|------------------------------|------------------|
| id | uuid, primary key, default uuid_generate_v4() | Уникальный идентификатор лога выполнения |
| habit_id | uuid, not null, foreign key references habits(id) on delete cascade | Идентификатор привычки |
| user_id | uuid, not null, foreign key references users(id) on delete cascade | Идентификатор пользователя |
| date | date, not null | Дата выполнения привычки |
| status | enum('COMPLETED', 'PARTIAL', 'SKIPPED_EXCUSED'), not null | Статус выполнения привычки |
| note | text | Заметка пользователя о выполнении |
| created_at | timestamp, not null, default now() | Дата и время создания записи |
| updated_at | timestamp, not null, default now() | Дата и время последнего обновления записи |

**Ограничения:** unique(habit_id, user_id, date)

**Индексы:** habit_id, user_id, date

### Таблица 2.10 – Структура таблицы «chats»

| Название столбца | Тип, ограничение целостности | Описание столбца |
|------------------|------------------------------|------------------|
| id | uuid, primary key, default uuid_generate_v4() | Уникальный идентификатор чата |
| team_id | uuid, unique, not null, foreign key references teams(id) on delete cascade | Идентификатор команды |
| created_at | timestamp, not null, default now() | Дата и время создания чата |

### Таблица 2.11 – Структура таблицы «messages»

| Название столбца | Тип, ограничение целостности | Описание столбца |
|------------------|------------------------------|------------------|
| id | uuid, primary key, default uuid_generate_v4() | Уникальный идентификатор сообщения |
| chat_id | uuid, not null, foreign key references chats(id) on delete cascade | Идентификатор чата |
| user_id | uuid, not null, foreign key references users(id) on delete cascade | Идентификатор автора сообщения |
| content | text, not null | Текст сообщения |
| media_url | varchar(500) | URL прикрепленного медиафайла |
| created_at | timestamp, not null, default now() | Дата и время создания сообщения |

**Индексы:** chat_id, user_id, created_at

### Таблица 2.12 – Структура таблицы «posts»

| Название столбца | Тип, ограничение целостности | Описание столбца |
|------------------|------------------------------|------------------|
| id | uuid, primary key, default uuid_generate_v4() | Уникальный идентификатор поста |
| team_id | uuid, not null, foreign key references teams(id) on delete cascade | Идентификатор команды |
| author_id | uuid, not null, foreign key references users(id) on delete cascade | Идентификатор автора поста |
| title | varchar(200), not null | Заголовок поста |
| content | text, not null | Содержимое поста |
| media_urls | jsonb, not null, default '[]' | Массив URL медиафайлов, прикрепленных к посту |
| created_at | timestamp, not null, default now() | Дата и время создания поста |
| updated_at | timestamp, not null, default now() | Дата и время последнего обновления поста |

**Индексы:** team_id, author_id, created_at

### Таблица 2.13 – Структура таблицы «user_dashboards»

| Название столбца | Тип, ограничение целостности | Описание столбца |
|------------------|------------------------------|------------------|
| id | uuid, primary key, default uuid_generate_v4() | Уникальный идентификатор дашборда |
| user_id | uuid, unique, not null, foreign key references users(id) on delete cascade | Идентификатор пользователя |
| layout_config | jsonb, not null, default '[]' | Конфигурация расположения виджетов на главной странице |
| created_at | timestamp, not null, default now() | Дата и время создания дашборда |
| updated_at | timestamp, not null, default now() | Дата и время последнего обновления дашборда |

### Таблица 2.14 – Структура таблицы «user_settings»

| Название столбца | Тип, ограничение целостности | Описание столбца |
|------------------|------------------------------|------------------|
| id | uuid, primary key, default uuid_generate_v4() | Уникальный идентификатор настроек |
| user_id | uuid, unique, not null, foreign key references users(id) on delete cascade | Идентификатор пользователя |
| settings | jsonb, not null | JSON-объект с настройками пользователя (тема, язык, настройки фона, расположение виджетов) |
| created_at | timestamp, not null, default now() | Дата и время создания настроек |
| updated_at | timestamp, not null, default now() | Дата и время последнего обновления настроек |

### 2.4.1 Перечисления (Enums)

**Таблица 2.15 – Перечисление «TeamRole»**

| Значение | Описание |
|----------|----------|
| MEMBER | Обычный член команды |
| ADMIN | Администратор команды с расширенными правами |
| OWNER | Владелец команды с полными правами |

**Таблица 2.16 – Перечисление «HabitLogStatus»**

| Значение | Описание |
|----------|----------|
| COMPLETED | Привычка выполнена полностью |
| PARTIAL | Привычка выполнена частично |
| SKIPPED_EXCUSED | Пропуск выполнения с разрешением администратора |

### 2.4.2 Ограничения целостности и бизнес-правила

**Каскадные удаления:**

- При удалении пользователя (User) каскадно удаляются все его сессии (Session), членства в командах (TeamMember), логи выполнения привычек (HabitLog), сообщения (Message), посты (Post), дашборд (UserDashboard) и настройки (UserSettings)
- При удалении команды (Team) каскадно удаляются все членства (TeamMember), челленджи (Challenge), чат (Chat), посты (Post), коды приглашений (TeamInvite) и записи whitelist (TeamWhitelistEmail)
- При удалении челленджа (Challenge) каскадно удаляются все привычки (Habit) и их логи выполнения (HabitLog)
- При удалении привычки (Habit) каскадно удаляются все логи выполнения (HabitLog)
- При удалении чата (Chat) каскадно удаляются все сообщения (Message)

**Уникальные ограничения:**

- Пара (team_id, user_id) в таблице team_members обеспечивает, что пользователь может быть членом команды только один раз
- Пара (team_id, email) в таблице team_whitelist_emails предотвращает дублирование email-адресов в whitelist
- Триада (habit_id, user_id, date) в таблице habit_logs обеспечивает, что для каждой комбинации привычки, пользователя и даты существует не более одной записи

**Бизнес-правила:**

- Никнейм пользователя может изменяться не чаще одного раза в 30 дней
- Дата окончания челленджа (end_date) должна быть строго позже даты начала (start_date)
- В каждой команде должен быть ровно один владелец (OWNER)
- Обычные участники не могут устанавливать статус SKIPPED_EXCUSED для своих привычек, это право доступно только администраторам и владельцам команды
- Код приглашения становится невалидным, если достигнут максимальный лимит использований (used_count >= max_uses) или превышена дата истечения (expires_at)