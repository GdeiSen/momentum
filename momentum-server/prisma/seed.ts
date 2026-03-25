import {
  PrismaClient,
  TeamRole,
  HabitLogStatus,
  WorkoutType,
  WorkoutLogStatus,
} from '@prisma/client';
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
  const ownerMember = await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user1.id } },
    update: {},
    create: {
      teamId: team.id,
      userId: user1.id,
      role: TeamRole.OWNER,
    },
  });

  const adminMember = await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user2.id } },
    update: {},
    create: {
      teamId: team.id,
      userId: user2.id,
      role: TeamRole.ADMIN,
    },
  });

  const basicMember = await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user3.id } },
    update: {},
    create: {
      teamId: team.id,
      userId: user3.id,
      role: TeamRole.MEMBER,
    },
  });

  console.log('✅ Added team members');

  // Seed baseline permissions
  const permissionDefinitions: Array<{ code: string; description: string }> = [
    { code: 'roles.manage', description: 'Create, update and delete custom role templates.' },
    { code: 'roles.assign', description: 'Assign and unassign role templates to team members.' },
    { code: 'permissions.view', description: 'View effective permissions in a team.' },
    { code: 'channels.create', description: 'Create team channels.' },
    { code: 'channels.manage', description: 'Manage team channels and access rules.' },
    { code: 'messages.moderate', description: 'Moderate team messages.' },
    { code: 'workouts.manage', description: 'Create, update and delete team workouts.' },
    { code: 'workouts.log', description: 'Log personal workout results in a team.' },
    { code: 'members.invite', description: 'Invite users into team.' },
    { code: 'members.remove', description: 'Remove members from team.' },
    { code: 'members.block', description: 'Block and unblock team members.' },
    { code: 'posts.create', description: 'Create posts in team feed.' },
    { code: 'posts.moderate', description: 'Moderate team posts.' },
    { code: 'workspace.update', description: 'Update workspace/team settings.' },
    { code: 'workspace.analytics.view', description: 'View team analytics and statistics.' },
  ];

  for (const permission of permissionDefinitions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { description: permission.description },
      create: {
        code: permission.code,
        description: permission.description,
      },
    });
  }

  const ownerRoleTemplate = await prisma.teamRoleTemplate.upsert({
    where: {
      teamId_name: {
        teamId: team.id,
        name: 'OWNER_SYSTEM',
      },
    },
    update: {
      description: 'System owner role template',
      isSystem: true,
    },
    create: {
      teamId: team.id,
      name: 'OWNER_SYSTEM',
      description: 'System owner role template',
      isSystem: true,
      createdBy: user1.id,
    },
  });

  const adminRoleTemplate = await prisma.teamRoleTemplate.upsert({
    where: {
      teamId_name: {
        teamId: team.id,
        name: 'ADMIN_SYSTEM',
      },
    },
    update: {
      description: 'System admin role template',
      isSystem: true,
    },
    create: {
      teamId: team.id,
      name: 'ADMIN_SYSTEM',
      description: 'System admin role template',
      isSystem: true,
      createdBy: user1.id,
    },
  });

  const memberRoleTemplate = await prisma.teamRoleTemplate.upsert({
    where: {
      teamId_name: {
        teamId: team.id,
        name: 'MEMBER_SYSTEM',
      },
    },
    update: {
      description: 'System member role template',
      isSystem: true,
    },
    create: {
      teamId: team.id,
      name: 'MEMBER_SYSTEM',
      description: 'System member role template',
      isSystem: true,
      createdBy: user1.id,
    },
  });

  const ownerPermissionCodes = permissionDefinitions.map((permission) => permission.code);
  const adminPermissionCodes = [
    'workspace.update',
    'workspace.analytics.view',
    'members.invite',
    'members.remove',
    'members.block',
    'posts.create',
    'posts.moderate',
    'channels.create',
    'channels.manage',
    'messages.moderate',
    'workouts.manage',
    'workouts.log',
    'permissions.view',
    'roles.assign',
  ];
  const memberPermissionCodes = ['posts.create', 'workouts.log'];

  const templatePermissionMatrix = [
    { templateId: ownerRoleTemplate.id, permissionCodes: ownerPermissionCodes },
    { templateId: adminRoleTemplate.id, permissionCodes: adminPermissionCodes },
    { templateId: memberRoleTemplate.id, permissionCodes: memberPermissionCodes },
  ];

  for (const entry of templatePermissionMatrix) {
    for (const permissionCode of entry.permissionCodes) {
      await prisma.teamRolePermission.upsert({
        where: {
          roleTemplateId_permissionCode: {
            roleTemplateId: entry.templateId,
            permissionCode,
          },
        },
        update: {},
        create: {
          roleTemplateId: entry.templateId,
          permissionCode,
        },
      });
    }
  }

  await prisma.teamMemberRoleAssignment.upsert({
    where: {
      teamMemberId_roleTemplateId: {
        teamMemberId: ownerMember.id,
        roleTemplateId: ownerRoleTemplate.id,
      },
    },
    update: {},
    create: {
      teamMemberId: ownerMember.id,
      roleTemplateId: ownerRoleTemplate.id,
      assignedBy: user1.id,
    },
  });

  await prisma.teamMemberRoleAssignment.upsert({
    where: {
      teamMemberId_roleTemplateId: {
        teamMemberId: adminMember.id,
        roleTemplateId: adminRoleTemplate.id,
      },
    },
    update: {},
    create: {
      teamMemberId: adminMember.id,
      roleTemplateId: adminRoleTemplate.id,
      assignedBy: user1.id,
    },
  });

  await prisma.teamMemberRoleAssignment.upsert({
    where: {
      teamMemberId_roleTemplateId: {
        teamMemberId: basicMember.id,
        roleTemplateId: memberRoleTemplate.id,
      },
    },
    update: {},
    create: {
      teamMemberId: basicMember.id,
      roleTemplateId: memberRoleTemplate.id,
      assignedBy: user1.id,
    },
  });

  console.log('✅ Seeded team RBAC baseline');

  await prisma.teamChannel.upsert({
    where: {
      teamId_slug: {
        teamId: team.id,
        slug: 'general',
      },
    },
    update: {
      isDefault: true,
      isArchived: false,
    },
    create: {
      teamId: team.id,
      name: 'General',
      slug: 'general',
      description: 'Main team conversation channel',
      isDefault: true,
      isArchived: false,
      createdBy: user1.id,
    },
  });

  await prisma.teamChannel.upsert({
    where: {
      teamId_slug: {
        teamId: team.id,
        slug: 'announcements',
      },
    },
    update: {
      isDefault: true,
      isArchived: false,
    },
    create: {
      teamId: team.id,
      name: 'Announcements',
      slug: 'announcements',
      description: 'Important updates from team admins',
      isDefault: true,
      isArchived: false,
      createdBy: user1.id,
    },
  });

  console.log('✅ Seeded default team channels');

  const sampleWorkout = await prisma.workout.upsert({
    where: { id: '00000000-0000-0000-0000-000000000006' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000006',
      teamId: team.id,
      createdBy: user1.id,
      title: 'Evening Cardio Session',
      description: '40-minute cardio workout with moderate intensity.',
      type: WorkoutType.CARDIO,
      scheduledDate: new Date(),
      durationMinutes: 40,
      caloriesTarget: 450,
    },
  });

  await prisma.workoutLog.upsert({
    where: {
      workoutId_userId: {
        workoutId: sampleWorkout.id,
        userId: user2.id,
      },
    },
    update: {},
    create: {
      workoutId: sampleWorkout.id,
      userId: user2.id,
      status: WorkoutLogStatus.COMPLETED,
      durationMinutes: 42,
      caloriesBurned: 470,
      distanceMeters: 6200,
      notes: 'Felt strong all session.',
    },
  });

  await prisma.workoutLog.upsert({
    where: {
      workoutId_userId: {
        workoutId: sampleWorkout.id,
        userId: user3.id,
      },
    },
    update: {},
    create: {
      workoutId: sampleWorkout.id,
      userId: user3.id,
      status: WorkoutLogStatus.PARTIAL,
      durationMinutes: 25,
      caloriesBurned: 290,
      distanceMeters: 3500,
      notes: 'Stopped early due to schedule.',
    },
  });

  console.log('✅ Seeded workout foundation data');

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
