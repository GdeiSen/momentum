#!/usr/bin/env node

/**
 * Momentum CLI Tool
 * 
 * Управление всей инфраструктурой проекта Momentum
 * Поддерживает локальный и Docker режимы запуска
 */

import { execa } from 'execa';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { Command } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Цвета для вывода
const colors = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  dim: chalk.dim,
};

// Утилиты для вывода
const print = {
  success: (msg) => console.log(colors.success('✓'), msg),
  error: (msg) => console.log(colors.error('✗'), msg),
  warning: (msg) => console.log(colors.warning('⚠'), msg),
  info: (msg) => console.log(colors.info('ℹ'), msg),
  header: (msg) => {
    console.log('');
    console.log(colors.info('═'.repeat(50)));
    console.log(colors.info(msg));
    console.log(colors.info('═'.repeat(50)));
    console.log('');
  },
};

/**
 * Проверка наличия Docker
 */
async function checkDocker() {
  try {
    await execa('docker', ['--version'], { stdio: 'ignore' });
    await execa('docker', ['compose', 'version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Проверка статуса сервисов Docker
 */
async function getDockerStatus() {
  try {
    const { stdout } = await execa('docker', ['compose', 'ps', '--format', 'json'], {
      cwd: PROJECT_ROOT,
    });
    const services = stdout
      .trim()
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
    return services;
  } catch {
    return [];
  }
}

/**
 * Запуск инфраструктуры (PostgreSQL + MinIO) в Docker
 */
async function startInfrastructure() {
  print.header('Запуск инфраструктуры');
  
  const hasDocker = await checkDocker();
  if (!hasDocker) {
    print.error('Docker не установлен или недоступен');
    process.exit(1);
  }

  try {
    await execa('docker', ['compose', 'up', '-d', 'postgres', 'minio'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
    print.success('Инфраструктура запущена');
    console.log('');
    console.log(colors.dim('PostgreSQL: localhost:5432'));
    console.log(colors.dim('MinIO API: localhost:9010'));
    console.log(colors.dim('MinIO Console: localhost:9011'));
    console.log(colors.dim('  Credentials: momentum_admin / momentum_secret_key'));
  } catch (error) {
    print.error('Ошибка при запуске инфраструктуры');
    process.exit(1);
  }
}

/**
 * Остановка инфраструктуры
 */
async function stopInfrastructure() {
  print.header('Остановка инфраструктуры');
  
  try {
    await execa('docker', ['compose', 'down'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
    print.success('Инфраструктура остановлена');
  } catch (error) {
    print.error('Ошибка при остановке инфраструктуры');
    process.exit(1);
  }
}

/**
 * Запуск сервера локально
 */
async function startServerLocal() {
  print.header('Запуск сервера (локально)');
  
  try {
    const serverDir = join(PROJECT_ROOT, 'momentum-server');
    
    // Проверка наличия .env файла
    try {
      readFileSync(join(serverDir, '.env'));
    } catch {
      print.warning('.env файл не найден. Убедитесь, что переменные окружения настроены.');
    }

    // Запуск в фоне
    const serverProcess = execa('npm', ['run', 'start:dev'], {
      cwd: serverDir,
      stdio: 'inherit',
    });

    print.success('Сервер запущен');
    console.log(colors.dim('API: http://localhost:3001/api'));
    console.log(colors.dim('Swagger: http://localhost:3001/api/docs'));
    
    return serverProcess;
  } catch (error) {
    print.error('Ошибка при запуске сервера');
    process.exit(1);
  }
}

/**
 * Запуск сервера в Docker
 */
async function startServerDocker() {
  print.header('Запуск сервера (Docker)');
  
  try {
    await execa('docker', ['compose', 'up', '-d', 'server'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
    print.success('Сервер запущен');
    console.log(colors.dim('API: http://localhost:3001/api'));
    console.log(colors.dim('Swagger: http://localhost:3001/api/docs'));
  } catch (error) {
    print.error('Ошибка при запуске сервера');
    process.exit(1);
  }
}

/**
 * Запуск клиента локально
 */
async function startClientLocal() {
  print.header('Запуск клиента (локально)');
  
  try {
    const clientDir = join(PROJECT_ROOT, 'momentum-client');
    
    const clientProcess = execa('npm', ['run', 'dev'], {
      cwd: clientDir,
      stdio: 'inherit',
    });

    print.success('Клиент запущен');
    console.log(colors.dim('Frontend: http://localhost:3000'));
    
    return clientProcess;
  } catch (error) {
    print.error('Ошибка при запуске клиента');
    process.exit(1);
  }
}

/**
 * Запуск клиента в Docker
 */
async function startClientDocker() {
  print.header('Запуск клиента (Docker)');
  
  try {
    await execa('docker', ['compose', 'up', '-d', 'client'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
    print.success('Клиент запущен');
    console.log(colors.dim('Frontend: http://localhost:3000'));
  } catch (error) {
    print.error('Ошибка при запуске клиента');
    process.exit(1);
  }
}

/**
 * Запуск всех сервисов локально
 */
async function startAllLocal() {
  print.header('Запуск всех сервисов (локально)');
  
  // Запускаем инфраструктуру в Docker
  await startInfrastructure();
  
  // Ждем немного для инициализации БД
  print.info('Ожидание готовности инфраструктуры...');
  await new Promise((resolve) => setTimeout(resolve, 5000));
  
  print.success('Инфраструктура готова');
  console.log('');
  print.info('Теперь запустите сервер и клиент в отдельных терминалах:');
  console.log('');
  console.log(colors.dim('Терминал 1 (Сервер):'));
  console.log(colors.info('  cd momentum-server'));
  console.log(colors.info('  npm run start:dev'));
  console.log('');
  console.log(colors.dim('Терминал 2 (Клиент):'));
  console.log(colors.info('  cd momentum-client'));
  console.log(colors.info('  npm run dev'));
  console.log('');
  console.log(colors.info('Доступные сервисы:'));
  console.log(colors.dim('  Frontend: http://localhost:3000'));
  console.log(colors.dim('  API: http://localhost:3001/api'));
  console.log(colors.dim('  Swagger: http://localhost:3001/api/docs'));
}

/**
 * Запуск всех сервисов в Docker
 */
async function startAllDocker() {
  print.header('Запуск всех сервисов (Docker)');
  
  try {
    await execa('docker', ['compose', 'up', '-d'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
    print.success('Все сервисы запущены');
    console.log('');
    console.log(colors.info('Доступные сервисы:'));
    console.log(colors.dim('  Frontend: http://localhost:3000'));
    console.log(colors.dim('  API: http://localhost:3001/api'));
    console.log(colors.dim('  Swagger: http://localhost:3001/api/docs'));
    console.log(colors.dim('  MinIO Console: http://localhost:9011'));
  } catch (error) {
    print.error('Ошибка при запуске сервисов');
    process.exit(1);
  }
}

/**
 * Остановка всех сервисов
 */
async function stopAll() {
  print.header('Остановка всех сервисов');
  
  try {
    await execa('docker', ['compose', 'down'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
    print.success('Все сервисы остановлены');
  } catch (error) {
    print.error('Ошибка при остановке сервисов');
    process.exit(1);
  }
}

/**
 * Показать статус сервисов
 */
async function showStatus() {
  print.header('Статус сервисов');
  
  const services = await getDockerStatus();
  
  if (services.length === 0) {
    print.warning('Сервисы не запущены');
    return;
  }

  console.log('');
  console.log(colors.info('Docker сервисы:'));
  services.forEach((service) => {
    const status = service.State === 'running' 
      ? colors.success('●') 
      : colors.error('○');
    const name = service.Name.padEnd(25);
    const state = service.State.padEnd(15);
    const ports = service.Ports || 'N/A';
    console.log(`  ${status} ${name} ${state} ${ports}`);
  });
  
  console.log('');
}

/**
 * Показать логи
 */
async function showLogs(service) {
  print.header(`Логи сервиса: ${service || 'все'}`);
  
  try {
    const args = service 
      ? ['compose', 'logs', '-f', service]
      : ['compose', 'logs', '-f'];
    
    await execa('docker', args, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
  } catch (error) {
    print.error('Ошибка при просмотре логов');
    process.exit(1);
  }
}

/**
 * Запуск миграций Prisma
 */
async function runMigrations() {
  print.header('Запуск миграций Prisma');
  
  const hasDocker = await checkDocker();
  if (!hasDocker) {
    print.error('Docker не установлен. Запустите миграции локально:');
    print.info('cd momentum-server && npx prisma migrate dev');
    process.exit(1);
  }

  try {
    await execa('docker', ['compose', 'exec', 'server', 'npx', 'prisma', 'migrate', 'deploy'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
    print.success('Миграции применены');
  } catch (error) {
    print.error('Ошибка при применении миграций');
    process.exit(1);
  }
}

/**
 * Заполнение БД тестовыми данными
 */
async function runSeed() {
  print.header('Заполнение БД тестовыми данными');
  
  const hasDocker = await checkDocker();
  if (!hasDocker) {
    print.error('Docker не установлен. Запустите seed локально:');
    print.info('cd momentum-server && npx prisma db seed');
    process.exit(1);
  }

  try {
    await execa('docker', ['compose', 'exec', 'server', 'npx', 'prisma', 'db', 'seed'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
    print.success('БД заполнена тестовыми данными');
    console.log('');
    print.info('Тестовые учетные данные:');
    console.log(colors.dim('  Email: alice@example.com'));
    console.log(colors.dim('  Password: Demo@123'));
  } catch (error) {
    print.error('Ошибка при заполнении БД');
    process.exit(1);
  }
}

/**
 * Интерактивное меню
 */
async function showInteractiveMenu() {
  const hasDocker = await checkDocker();
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Выберите действие:',
      choices: [
        { name: '🚀 Запустить всё (Docker)', value: 'start:docker' },
        { name: '🚀 Запустить всё (локально)', value: 'start:local' },
        { name: '🛑 Остановить всё', value: 'stop' },
        { name: '📊 Статус сервисов', value: 'status' },
        { name: '📝 Логи', value: 'logs' },
        { name: '🗄️  Миграции БД', value: 'migrate' },
        { name: '🌱 Заполнить БД тестовыми данными', value: 'seed' },
        { name: '❌ Выход', value: 'exit' },
      ],
    },
  ]);

  switch (action) {
    case 'start:docker':
      await startAllDocker();
      break;
    case 'start:local':
      await startAllLocal();
      break;
    case 'stop':
      await stopAll();
      break;
    case 'status':
      await showStatus();
      break;
    case 'logs': {
      const services = await getDockerStatus();
      const serviceNames = services.map((s) => s.Name);
      const { service } = await inquirer.prompt([
        {
          type: 'list',
          name: 'service',
          message: 'Выберите сервис:',
          choices: [{ name: 'Все сервисы', value: null }, ...serviceNames.map((name) => ({ name, value: name }))],
        },
      ]);
      await showLogs(service);
      break;
    }
    case 'migrate':
      await runMigrations();
      break;
    case 'seed':
      await runSeed();
      break;
    case 'exit':
      print.info('До свидания!');
      process.exit(0);
  }
}

// CLI команды
const program = new Command();

program
  .name('momentum')
  .description('CLI инструмент для управления инфраструктурой Momentum')
  .version('1.0.0');

program
  .command('dev')
  .description('Интерактивное меню для управления сервисами')
  .action(async () => {
    await showInteractiveMenu();
  });

program
  .command('start')
  .description('Запустить все сервисы')
  .option('-m, --mode <mode>', 'Режим запуска: docker или local', 'docker')
  .action(async (options) => {
    if (options.mode === 'local') {
      await startAllLocal();
    } else {
      await startAllDocker();
    }
  });

program
  .command('stop')
  .description('Остановить все сервисы')
  .action(async () => {
    await stopAll();
  });

program
  .command('status')
  .description('Показать статус сервисов')
  .action(async () => {
    await showStatus();
  });

program
  .command('logs')
  .description('Показать логи сервисов')
  .argument('[service]', 'Имя сервиса (postgres, minio, server, client)')
  .action(async (service) => {
    await showLogs(service);
  });

program
  .command('migrate')
  .description('Применить миграции Prisma')
  .action(async () => {
    await runMigrations();
  });

program
  .command('seed')
  .description('Заполнить БД тестовыми данными')
  .action(async () => {
    await runSeed();
  });

program
  .command('infra')
  .description('Управление инфраструктурой')
  .argument('<action>', 'start или stop')
  .action(async (action) => {
    if (action === 'start') {
      await startInfrastructure();
    } else if (action === 'stop') {
      await stopInfrastructure();
    } else {
      print.error('Неизвестное действие. Используйте: start или stop');
      process.exit(1);
    }
  });

// Если команда не указана, показываем интерактивное меню
if (process.argv.length === 2) {
  showInteractiveMenu();
} else {
  program.parse();
}

