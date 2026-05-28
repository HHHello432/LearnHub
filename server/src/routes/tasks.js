import { Router } from 'express';
import { prisma } from '../index.js';
import auth, { rejectGuest } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// GET /api/tasks - List user's tasks
router.get('/', async (req, res) => {
  try {
    const { status, priority, category } = req.query;
    const where = { userId: req.userId };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: tasks });
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ success: false, message: '获取待办列表失败' });
  }
});

// POST /api/tasks - Create task
router.post('/', rejectGuest, async (req, res) => {
  try {
    const { title, description, priority, category, dueDate, pointsReward } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: '标题不能为空' });
    }

    const task = await prisma.task.create({
      data: {
        userId: req.userId,
        title,
        description,
        priority: priority || 'important',
        category,
        pointsReward: pointsReward !== undefined ? parseInt(pointsReward) : 10,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    res.status(201).json({ success: true, message: '创建成功', data: task });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ success: false, message: '创建待办失败' });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', rejectGuest, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '待办不存在' });
    }

    const { title, description, priority, status, category, dueDate } = req.body;
    const data = {};

    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (priority !== undefined) data.priority = priority;
    if (status !== undefined) {
      data.status = status;
      if (status === 'done') {
        data.completedAt = new Date();
      } else {
        data.completedAt = null;
      }
    }
    if (category !== undefined) data.category = category;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

    // Auto-update exp when task is completed
    const task = await prisma.task.update({
      where: { id: taskId },
      data,
    });

    if (status === 'done' && existing.status !== 'done') {
      // 从未完成→完成：加分
      const pts = existing.pointsReward || 10;
      await prisma.user.update({
        where: { id: req.userId },
        data: { exp: { increment: pts } },
      });
      await prisma.pointsLog.create({
        data: {
          userId: req.userId,
          points: pts,
          type: 'earn',
          source: 'task_complete',
          referenceId: String(taskId),
          remark: `完成任务「${task.title}」+${pts}积分`,
        },
      });
    } else if (status === 'todo' && existing.status === 'done') {
      // 从完成→未完成：扣回积分
      const pts = existing.pointsReward || 10;
      await prisma.user.update({
        where: { id: req.userId },
        data: { exp: { decrement: pts } },
      });
      await prisma.pointsLog.create({
        data: {
          userId: req.userId,
          points: -pts,
          type: 'spend',
          source: 'task_uncomplete',
          referenceId: String(taskId),
          remark: `取消完成任务「${task.title}」-${pts}积分`,
        },
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

    res.json({ success: true, message: '更新成功', data: task });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ success: false, message: '更新待办失败' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', rejectGuest, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '待办不存在' });
    }

    await prisma.task.delete({ where: { id: taskId } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ success: false, message: '删除待办失败' });
  }
});

// GET /api/tasks/stats - Task statistics
router.get('/stats', async (req, res) => {
  try {
    const total = await prisma.task.count({ where: { userId: req.userId } });
    const done = await prisma.task.count({
      where: { userId: req.userId, status: 'done' },
    });
    const todo = await prisma.task.count({
      where: { userId: req.userId, status: 'todo' },
    });

    // Today's completed
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const todayDone = await prisma.task.count({
      where: {
        userId: req.userId,
        status: 'done',
        completedAt: { gte: todayStart, lt: todayEnd },
      },
    });

    // Overdue
    const overdue = await prisma.task.count({
      where: {
        userId: req.userId,
        status: 'todo',
        dueDate: { lt: new Date() },
      },
    });

    res.json({
      success: true,
      data: { total, done, todo, todayDone, overdue },
    });
  } catch (err) {
    console.error('Task stats error:', err);
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

export default router;
