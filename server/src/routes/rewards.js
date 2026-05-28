import { Router } from 'express';
import { prisma } from '../index.js';
import auth, { rejectGuest } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// GET /api/rewards/points - Points transaction log
router.get('/points', async (req, res) => {
  try {
    const { limit, offset, type } = req.query;
    const where = { userId: req.userId };

    if (type) where.type = type;

    const logs = await prisma.pointsLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 50,
      skip: offset ? parseInt(offset) : 0,
    });

    const total = await prisma.pointsLog.count({ where });

    // Calculate balance, total earned, total spent
    const [earnedAgg, spentAgg] = await Promise.all([
      prisma.pointsLog.aggregate({
        where: { userId: req.userId, type: 'earn' },
        _sum: { points: true },
      }),
      prisma.pointsLog.aggregate({
        where: { userId: req.userId, type: 'spend' },
        _sum: { points: true },
      }),
    ]);
    const totalEarned = earnedAgg._sum.points || 0;
    const totalSpent = Math.abs(spentAgg._sum.points || 0);
    const balance = totalEarned - totalSpent;

    res.json({
      success: true,
      data: {
        balance,
        totalEarned,
        totalSpent,
        logs,
        pagination: { total, limit: parseInt(limit) || 50, offset: parseInt(offset) || 0 },
      },
    });
  } catch (err) {
    console.error('Get points error:', err);
    res.status(500).json({ success: false, message: '获取积分明细失败' });
  }
});

// GET /api/rewards/me - User's points, level, achievements
router.get('/me', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        level: true,
        exp: true,
        nickname: true,
        avatar: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // Calculate points = total earned - total spent
    const pointsAgg = await prisma.pointsLog.aggregate({
      where: { userId: req.userId },
      _sum: { points: true },
    });

    const totalPoints = pointsAgg._sum.points || 0;
    const expNeeded = user.level * 100;
    const levelProgress = Math.min(Math.floor((user.exp / expNeeded) * 100), 100);

    res.json({
      success: true,
      data: {
        ...user,
        points: totalPoints,
        expNeeded,
        levelProgress,
      },
    });
  } catch (err) {
    console.error('Get rewards me error:', err);
    res.status(500).json({ success: false, message: '获取用户积分信息失败' });
  }
});

// GET /api/rewards/achievements
router.get('/achievements', async (req, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      where: { userId: req.userId },
      orderBy: { earnedAt: 'desc' },
    });

    // Define all possible achievements
    const allBadges = [
      { badgeName: '初次完成', badgeIcon: '🎯', description: '完成第一个待办任务' },
      { badgeName: '勤奋学习者', badgeIcon: '📚', description: '累计完成10个待办任务' },
      { badgeName: '专注达人', badgeIcon: '🍅', description: '完成50个番茄钟' },
      { badgeName: '打卡先锋', badgeIcon: '📅', description: '连续打卡7天' },
      { badgeName: '笔记大师', badgeIcon: '📝', description: '创建20篇笔记' },
      { badgeName: '日记达人', badgeIcon: '📖', description: '写10篇日记' },
      { badgeName: '升级达人', badgeIcon: '🌟', description: '达到5级' },
      { badgeName: '购物狂', badgeIcon: '🛒', description: '在商城兑换物品' },
    ];

    const earnedBadges = achievements.map(a => ({
      badgeName: a.badgeName,
      badgeIcon: a.badgeIcon,
      earnedAt: a.earnedAt,
      earned: true,
    }));

    const allBadgesWithStatus = allBadges.map(b => {
      const earned = earnedBadges.find(e => e.badgeName === b.badgeName);
      return earned || { ...b, earned: false, earnedAt: null };
    });

    res.json({ success: true, data: { earned: earnedBadges, all: allBadgesWithStatus } });
  } catch (err) {
    console.error('Get achievements error:', err);
    res.status(500).json({ success: false, message: '获取成就列表失败' });
  }
});

// POST /api/rewards/exchange - Exchange points (spend)
router.post('/exchange', rejectGuest, async (req, res) => {
  try {
    const { points, source, remark } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({ success: false, message: '积分数量无效' });
    }

    // Check total points
    const pointsAgg = await prisma.pointsLog.aggregate({
      where: { userId: req.userId },
      _sum: { points: true },
    });

    const totalPoints = pointsAgg._sum.points || 0;
    if (totalPoints < points) {
      return res.status(400).json({ success: false, message: '积分不足' });
    }

    const log = await prisma.pointsLog.create({
      data: {
        userId: req.userId,
        points: -points,
        type: 'spend',
        source: source || 'exchange',
        remark: remark || '积分兑换',
      },
    });

    res.json({ success: true, message: '兑换成功', data: log });
  } catch (err) {
    console.error('Exchange points error:', err);
    res.status(500).json({ success: false, message: '兑换失败' });
  }
});

export default router;
