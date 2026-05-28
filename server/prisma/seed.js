import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── 1. Create admin user ──
  const adminPassword = await bcrypt.hash('123456', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: adminPassword, role: 'admin', nickname: '管理员' },
    create: {
      username: 'admin',
      password: adminPassword,
      nickname: '管理员',
      avatar: null,
      level: 1,
      exp: 0,
      role: 'admin',
    },
  });
  console.log(`✅ Admin created: admin (id: ${admin.id}, role: admin)`);

  // ── 2. Create test guest user ──
  const guestPassword = await bcrypt.hash('test123', 10);
  const guest = await prisma.user.upsert({
    where: { username: 'test' },
    update: { password: guestPassword, role: 'guest', nickname: '测试游客' },
    create: {
      username: 'test',
      password: guestPassword,
      nickname: '测试游客',
      avatar: null,
      level: 1,
      exp: 0,
      role: 'guest',
    },
  });
  console.log(`✅ Guest created: test (id: ${guest.id}, role: guest)`);

  // ── 3. Create invite codes ──
  const inviteCodes = [
    {
      code: 'ADMIN2026',
      role: 'user',
      maxUses: 5,
      createdBy: admin.id,
    },
  ];

  for (const ic of inviteCodes) {
    const existing = await prisma.inviteCode.findUnique({ where: { code: ic.code } });
    if (!existing) {
      await prisma.inviteCode.create({ data: ic });
      console.log(`✅ Invite code created: ${ic.code} (role: ${ic.role}, maxUses: ${ic.maxUses})`);
    } else {
      console.log(`⏭️  Invite code exists: ${ic.code}`);
    }
  }

  // ── 4. Create sample shop items ──
  const shopItems = [
    {
      name: '专注达人徽章',
      description: '虚拟徽章，彰显你的专注力！累计完成50个番茄钟即可佩戴。',
      price: 500,
      stock: -1,
      image: null,
      type: 'virtual',
      isActive: true,
    },
    {
      name: '学习笔记模板包',
      description: '10种精美笔记模板，助你高效整理学习内容。',
      price: 200,
      stock: 100,
      image: null,
      type: 'virtual',
      isActive: true,
    },
    {
      name: '自定义头像边框',
      description: '为你的个人资料添加独特的头像边框，展现个性。',
      price: 300,
      stock: -1,
      image: null,
      type: 'virtual',
      isActive: true,
    },
    {
      name: '学习计划表实体版',
      description: '精美的纸质学习计划表，包邮到家。',
      price: 1000,
      stock: 50,
      image: null,
      type: 'physical',
      isActive: true,
    },
    {
      name: 'LearnHub 限定帆布包',
      description: 'LearnHub 专属帆布包，简约时尚，限量发售。',
      price: 2000,
      stock: 20,
      image: null,
      type: 'physical',
      isActive: true,
    },
    {
      name: '知识星球入场券',
      description: '加入专属学习社群，与志同道合的小伙伴一起进步！',
      price: 1500,
      stock: 200,
      image: null,
      type: 'virtual',
      isActive: true,
    },
  ];

  for (const item of shopItems) {
    const existing = await prisma.shopItem.findFirst({
      where: { name: item.name },
    });
    if (!existing) {
      await prisma.shopItem.create({ data: item });
    }
  }

  console.log(`✅ ${shopItems.length} shop items created`);

  // ── 5. Create sample achievements for admin ──
  const achievements = [
    { badgeName: '初次完成', badgeIcon: '🎯' },
    { badgeName: '勤奋学习者', badgeIcon: '📚' },
  ];

  for (const ach of achievements) {
    const existing = await prisma.achievement.findFirst({
      where: { userId: admin.id, badgeName: ach.badgeName },
    });
    if (!existing) {
      await prisma.achievement.create({
        data: {
          userId: admin.id,
          badgeName: ach.badgeName,
          badgeIcon: ach.badgeIcon,
        },
      });
    }
  }

  console.log('✅ Sample achievements created');
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
