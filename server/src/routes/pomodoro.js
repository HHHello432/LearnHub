import { Router } from 'express';
import { prisma } from '../index.js';
import auth, { rejectGuest } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// GET /api/pomodoro - List pomodoro sessions
router.get('/', async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const sessions = await prisma.pomodoroSession.findMany({
      where: { userId: req.userId },
      include: { task: { select: { id: true, title: true } } },
      orderBy: { startedAt: 'desc' },
      take: limit ? parseInt(limit) : 50,
      skip: offset ? parseInt(offset) : 0,
    });

    res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('Get pomodoro sessions error:', err);
    res.status(500).json({ success: false, message: '获取番茄钟记录失败' });
  }
});

// POST /api/pomodoro - Create a pomodoro session
router.post('/', rejectGuest, async (req, res) => {
  try {
    const { taskId, durationPlanned, durationActual, type, status, startedAt, endedAt } = req.body;

    const session = await prisma.pomodoroSession.create({
      data: {
        userId: req.userId,
        taskId: taskId ? parseInt(taskId) : null,
        durationPlanned: durationPlanned || 25,
        durationActual: durationActual || durationPlanned || 25,
        type: type || 'focus',
        status: status || 'completed',
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        endedAt: endedAt ? new Date(endedAt) : new Date(),
      },
    });

    // Award exp for completed focus sessions
    if ((status || 'completed') === 'completed' && (type || 'focus') === 'focus') {
      const expGain = 10;
      await prisma.user.update({
        where: { id: req.userId },
        data: { exp: { increment: expGain } },
      });

      await prisma.pointsLog.create({
        data: {
          userId: req.userId,
          points: expGain,
          type: 'earn',
          source: 'pomodoro_complete',
          referenceId: String(session.id),
          remark: `完成一次专注番茄钟（${session.durationActual || session.durationPlanned}分钟）`,
        },
      });

      // Update task pomodoro count
      if (taskId) {
        await prisma.task.update({
          where: { id: parseInt(taskId) },
          data: { pomodoroCount: { increment: 1 } },
        });
      }

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
    }

    res.status(201).json({ success: true, message: '记录成功', data: session });
  } catch (err) {
    console.error('Create pomodoro session error:', err);
    res.status(500).json({ success: false, message: '创建番茄钟记录失败' });
  }
});

// GET /api/pomodoro/stats
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    // Today's total focus time
    const todaySessions = await prisma.pomodoroSession.findMany({
      where: {
        userId: req.userId,
        type: 'focus',
        status: 'completed',
        startedAt: { gte: todayStart, lt: todayEnd },
      },
    });

    const todayTotalMinutes = todaySessions.reduce(
      (sum, s) => sum + (s.durationActual || s.durationPlanned),
      0
    );

    // This week trend (last 7 days)
    const weekStart = new Date(todayStart.getTime() - 6 * 86400000);
    const weekSessions = await prisma.pomodoroSession.findMany({
      where: {
        userId: req.userId,
        type: 'focus',
        status: 'completed',
        startedAt: { gte: weekStart },
      },
    });

    const weeklyData = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(weekStart.getTime() + i * 86400000);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const daySessions = weekSessions.filter(
        (s) => s.startedAt >= dayStart && s.startedAt < dayEnd
      );
      const minutes = daySessions.reduce(
        (sum, s) => sum + (s.durationActual || s.durationPlanned),
        0
      );
      weeklyData.push({
        date: dayStart.toISOString().split('T')[0],
        sessions: daySessions.length,
        totalMinutes: minutes,
      });
    }

    // Total stats
    const totalSessions = await prisma.pomodoroSession.count({
      where: { userId: req.userId, type: 'focus' },
    });
    const totalCompleted = await prisma.pomodoroSession.count({
      where: { userId: req.userId, type: 'focus', status: 'completed' },
    });
    const totalFocusMinutes = (await prisma.pomodoroSession.aggregate({
      where: { userId: req.userId, type: 'focus', status: 'completed' },
      _sum: { durationActual: true },
    }))._sum.durationActual || 0;

    res.json({
      success: true,
      data: {
        todaySessions: todaySessions.length,
        todayTotalMinutes,
        totalSessions,
        totalCompleted,
        totalFocusMinutes,
        weeklyData,
      },
    });
  } catch (err) {
    console.error('Pomodoro stats error:', err);
    res.status(500).json({ success: false, message: '获取番茄钟统计失败' });
  }
});

// GET /api/pomodoro/history - 按月查询历史记录
router.get('/history', async (req, res) => {
  try {
    const { year, month } = req.query;
    const now = new Date();
    const y = year ? parseInt(year) : now.getFullYear();
    const m = month ? parseInt(month) - 1 : now.getMonth();

    const monthStart = new Date(y, m, 1);
    const monthEnd = new Date(y, m + 1, 1);

    const sessions = await prisma.pomodoroSession.findMany({
      where: {
        userId: req.userId,
        type: 'focus',
        status: 'completed',
        startedAt: { gte: monthStart, lt: monthEnd },
      },
      orderBy: { startedAt: 'asc' },
    });

    // 按天分组
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const dailyData = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStart = new Date(y, m, d);
      const dayEnd = new Date(y, m, d + 1);
      const daySessions = sessions.filter(
        (s) => s.startedAt >= dayStart && s.startedAt < dayEnd
      );
      if (daySessions.length > 0) {
        dailyData.push({
          date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          sessions: daySessions.length,
          totalMinutes: daySessions.reduce(
            (sum, s) => sum + (s.durationActual || s.durationPlanned),
            0
          ),
        });
      }
    }

    // 当月汇总
    const monthSessions = sessions.length;
    const monthMinutes = sessions.reduce(
      (sum, s) => sum + (s.durationActual || s.durationPlanned),
      0
    );

    res.json({
      success: true,
      data: {
        year: y,
        month: m + 1,
        monthSessions,
        monthMinutes,
        dailyData,
      },
    });
  } catch (err) {
    console.error('Pomodoro history error:', err);
    res.status(500).json({ success: false, message: '获取历史记录失败' });
  }
});

export default router;
