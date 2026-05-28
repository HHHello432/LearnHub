import { Router } from 'express';
import { prisma } from '../index.js';
import auth, { rejectGuest, guestAsDemo } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// GET /api/checkins - List check-in records (supports month filter)
router.get('/', guestAsDemo, async (req, res) => {
  try {
    const { month, habitName } = req.query;
    const where = { userId: req.userId };

    if (habitName) {
      where.habitName = habitName;
    }

    if (month) {
      const [year, m] = month.split('-').map(Number);
      const monthStart = new Date(year, m - 1, 1);
      const monthEnd = new Date(year, m, 1);
      where.date = { gte: monthStart, lt: monthEnd };
    }

    const checkins = await prisma.checkin.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    res.json({ success: true, data: checkins });
  } catch (err) {
    console.error('Get checkins error:', err);
    res.status(500).json({ success: false, message: '获取打卡记录失败' });
  }
});

// POST /api/checkins - Check in
router.post('/', rejectGuest, async (req, res) => {
  try {
    const { habitName, date, status, points } = req.body;
    const checkinPoints = (points !== undefined ? parseInt(points) : 5) || 5;

    if (!habitName) {
      return res.status(400).json({ success: false, message: '习惯名称不能为空' });
    }

    const checkinDate = date ? new Date(date) : new Date();
    const dayStart = new Date(checkinDate.getFullYear(), checkinDate.getMonth(), checkinDate.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86400000);

    // Check if already checked in today for this habit
    const existing = await prisma.checkin.findFirst({
      where: {
        userId: req.userId,
        habitName,
        date: { gte: dayStart, lt: dayEnd },
      },
    });

    if (existing) {
      return res.status(409).json({ success: false, message: '今天已打卡该习惯' });
    }

    // Calculate streak: check yesterday
    const yesterdayStart = new Date(dayStart.getTime() - 86400000);
    const yesterdayEnd = new Date(dayStart.getTime());
    const yesterdayCheckin = await prisma.checkin.findFirst({
      where: {
        userId: req.userId,
        habitName,
        date: { gte: yesterdayStart, lt: yesterdayEnd },
      },
    });

    const streakCount = yesterdayCheckin ? yesterdayCheckin.streakCount + 1 : 1;

    const checkin = await prisma.checkin.create({
      data: {
        userId: req.userId,
        habitName,
        date: dayStart,
        status: status || 'done',
        streakCount,
        points: checkinPoints,
      },
    });

    // Award exp for check-in
    await prisma.user.update({
      where: { id: req.userId },
      data: { exp: { increment: checkinPoints } },
    });

    await prisma.pointsLog.create({
      data: {
        userId: req.userId,
        points: checkinPoints,
        type: 'earn',
        source: 'checkin',
        referenceId: String(checkin.id),
        remark: `打卡「${habitName}」连续${streakCount}天`,
      },
    });

    // Check level up
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const expNeeded = user.level * 100;
    if (user.exp >= expNeeded) {
      await prisma.user.update({
        where: { id: req.userId },
        data: {
          level: { increment: 1 },
          exp: user.exp - expNeeded,
        },
      });
    }

    res.status(201).json({ success: true, message: '打卡成功', data: checkin });
  } catch (err) {
    console.error('Checkin error:', err);
    res.status(500).json({ success: false, message: '打卡失败' });
  }
});

// DELETE /api/checkins/record/:id - 删除单条打卡记录
router.delete('/record/:id', rejectGuest, async (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    const existing = await prisma.checkin.findFirst({
      where: { id: recordId, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '打卡记录不存在' });
    }

    const pointsDeducted = existing.points || 5;

    // 删除打卡记录
    await prisma.checkin.delete({ where: { id: recordId } });

    // 用户的 exp 和积分扣回
    await prisma.user.update({
      where: { id: req.userId },
      data: { exp: { decrement: pointsDeducted } },
    });

    // 扣减积分日志
    await prisma.pointsLog.create({
      data: {
        userId: req.userId,
        points: pointsDeducted,
        type: 'deduct',
        source: 'checkin_undo',
        referenceId: String(recordId),
        remark: `取消打卡「${existing.habitName}」`,
      },
    });

    res.json({ success: true, message: '已取消打卡' });
  } catch (err) {
    console.error('Delete checkin record error:', err);
    res.status(500).json({ success: false, message: '删除打卡记录失败' });
  }
});

// DELETE /api/checkins/:habitName - 删除一个习惯（删除该习惯所有打卡记录）
router.delete('/:habitName', rejectGuest, async (req, res) => {
  try {
    const { habitName } = req.params;
    if (!habitName) {
      return res.status(400).json({ success: false, message: '习惯名称不能为空' });
    }

    const result = await prisma.checkin.deleteMany({
      where: {
        userId: req.userId,
        habitName: decodeURIComponent(habitName),
      },
    });

    res.json({ success: true, message: '删除习惯成功', data: { deleted: result.count } });
  } catch (err) {
    console.error('Delete habit error:', err);
    res.status(500).json({ success: false, message: '删除习惯失败' });
  }
});

// GET /api/checkins/stats
router.get('/stats', guestAsDemo, async (req, res) => {
  try {
    const { habitName } = req.query;

    // Get all current month checkins
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const where = { userId: req.userId, date: { gte: monthStart, lt: monthEnd } };
    if (habitName) where.habitName = habitName;

    const monthCheckins = await prisma.checkin.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    // Group by habit
    const habitStats = {};
    for (const c of monthCheckins) {
      if (!habitStats[c.habitName]) {
        habitStats[c.habitName] = {
          habitName: c.habitName,
          totalDays: 0,
          currentStreak: c.streakCount,
          records: [],
        };
      }
      habitStats[c.habitName].totalDays++;
      habitStats[c.habitName].records.push({
        date: c.date.toISOString().split('T')[0],
        status: c.status,
        streakCount: c.streakCount,
      });
    }

    // Total distinct habits
    const habits = Object.keys(habitStats);

    res.json({
      success: true,
      data: {
        totalHabits: habits.length,
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        habits: habitStats,
      },
    });
  } catch (err) {
    console.error('Checkin stats error:', err);
    res.status(500).json({ success: false, message: '获取打卡统计失败' });
  }
});

export default router;
