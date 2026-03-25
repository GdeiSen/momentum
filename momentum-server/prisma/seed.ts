import { PrismaClient, TeamRole, HabitLogStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo users
  const passwordHash = await argon2.hash('Demo@123');

  const user1 = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      passwordHash,
      nickname: 'Alice',
      bio: 'Productivity enthusiast and habit tracker advocate.',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      passwordHash,
      nickname: 'Bob',
      bio: 'Software developer building better habits.',
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: {
      email: 'charlie@example.com',
      passwordHash,
      nickname: 'Charlie',
      bio: 'Fitness lover and morning person.',
    },
  });

  console.log('✅ Created demo users');

  // Create a demo team
  const team = await prisma.team.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Productivity Masters',
      slogan: 'Building habits, one day at a time',
      description:
        'A team dedicated to building productive habits and achieving goals together. Join us on our journey to self-improvement!',
      ownerId: user1.id,
      isPrivate: false,
    },
  });

  console.log('✅ Created demo team');

  // Add team members
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user1.id } },
    update: {},
    create: {
      teamId: team.id,
      userId: user1.id,
      role: TeamRole.OWNER,
    },
  });

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user2.id } },
    update: {},
    create: {
      teamId: team.id,
      userId: user2.id,
      role: TeamRole.ADMIN,
    },
  });

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user3.id } },
    update: {},
    create: {
      teamId: team.id,
      userId: user3.id,
      role: TeamRole.MEMBER,
    },
  });

  console.log('✅ Added team members');

  // Create team chat
  await prisma.chat.upsert({
    where: { teamId: team.id },
    update: {},
    create: {
      teamId: team.id,
    },
  });

  console.log('✅ Created team chat');

  // Create a demo challenge
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(1); // First day of current month

  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 1);
  endDate.setDate(0); // Last day of current month

  const challenge = await prisma.challenge.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      teamId: team.id,
      title: 'Monthly Productivity Sprint',
      description:
        'A month-long challenge to build productive habits. Complete daily tasks to improve your productivity and well-being.',
      startDate,
      endDate,
    },
  });

  console.log('✅ Created demo challenge');

  // Create demo habits
  const habit1 = await prisma.habit.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      challengeId: challenge.id,
      title: 'Read 30 minutes',
      description: 'Read any book or educational content for at least 30 minutes.',
    },
  });

  const habit2 = await prisma.habit.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      challengeId: challenge.id,
      title: 'Exercise 20 minutes',
      description: 'Any form of physical exercise for at least 20 minutes.',
    },
  });

  const habit3 = await prisma.habit.upsert({
    where: { id: '00000000-0000-0000-0000-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000005',
      challengeId: challenge.id,
      title: 'Meditate 10 minutes',
      description: 'Practice mindfulness or meditation for at least 10 minutes.',
    },
  });

  console.log('✅ Created demo habits');

  // Create some demo habit logs (last 7 days)
  const users = [user1, user2, user3];
  const habits = [habit1, habit2, habit3];
  const statuses = [HabitLogStatus.COMPLETED, HabitLogStatus.PARTIAL, HabitLogStatus.COMPLETED];

  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
    const logDate = new Date(today);
    logDate.setDate(logDate.getDate() - dayOffset);
    logDate.setHours(0, 0, 0, 0);

    // Only create logs if within challenge period
    if (logDate >= startDate && logDate <= endDate) {
      for (const user of users) {
        for (let i = 0; i < habits.length; i++) {
          const habit = habits[i];
          // Random completion (70% chance of completing)
          if (Math.random() < 0.7) {
            const status = statuses[Math.floor(Math.random() * statuses.length)];

            await prisma.habitLog.upsert({
              where: {
                habitId_userId_date: {
                  habitId: habit.id,
                  userId: user.id,
                  date: logDate,
                },
              },
              update: {},
              create: {
                habitId: habit.id,
                userId: user.id,
                date: logDate,
                status,
              },
            });
          }
        }
      }
    }
  }

  console.log('✅ Created demo habit logs');

  // Create user dashboards
  for (const user of users) {
    await prisma.userDashboard.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        layoutConfig: [
          { id: 'widget-1', type: 'active-team', position: { x: 0, y: 0, w: 2, h: 1 } },
          { id: 'widget-2', type: 'current-streak', position: { x: 2, y: 0, w: 2, h: 1 } },
          { id: 'widget-3', type: 'habit-counter', position: { x: 0, y: 1, w: 2, h: 1 } },
          { id: 'widget-4', type: 'challenge-counter', position: { x: 2, y: 1, w: 2, h: 1 } },
        ],
      },
    });
  }

  console.log('✅ Created user dashboards');

  console.log('🎉 Database seed completed successfully!');
  console.log('\n📝 Demo credentials:');
  console.log('   Email: alice@example.com, bob@example.com, charlie@example.com');
  console.log('   Password: Demo@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

