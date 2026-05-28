import { Router } from 'express';
import { prisma } from '../index.js';
import auth, { rejectGuest } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// GET /api/diaries - List diaries (supports date/month filtering)
router.get('/', async (req, res) => {
  try {
    const { date, month } = req.query;
    const where = { userId: req.userId };

    if (date) {
      // Single day filter
      const d = new Date(date);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      where.date = { gte: dayStart, lt: dayEnd };
    } else if (month) {
      // Month filter: YYYY-MM
      const [year, m] = month.split('-').map(Number);
      const monthStart = new Date(year, m - 1, 1);
      const monthEnd = new Date(year, m, 1);
      where.date = { gte: monthStart, lt: monthEnd };
    }

    const diaries = await prisma.diary.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    res.json({ success: true, data: diaries });
  } catch (err) {
    console.error('Get diaries error:', err);
    res.status(500).json({ success: false, message: '获取日记列表失败' });
  }
});

// POST /api/diaries - Create diary
router.post('/', rejectGuest, async (req, res) => {
  try {
    const { title, content, mood, weather, isPublic, date } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: '标题不能为空' });
    }

    const diary = await prisma.diary.create({
      data: {
        userId: req.userId,
        title,
        content,
        mood,
        weather,
        isPublic: isPublic || false,
        date: date ? new Date(date) : new Date(),
      },
    });

    // 奖励积分：创建日记 +8，内容每100字额外+3
    let pointsEarned = 8;
    if (content && content.length >= 100) {
      pointsEarned += Math.floor(content.length / 100) * 3;
    }
    await prisma.user.update({
      where: { id: req.userId },
      data: { exp: { increment: pointsEarned } },
    });
    await prisma.pointsLog.create({
      data: {
        userId: req.userId,
        points: pointsEarned,
        type: 'earn',
        source: 'diary_create',
        referenceId: String(diary.id),
        remark: `创建日记「${title}」${content?.length ? `(${content.length}字)` : ''}`,
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

    res.status(201).json({ success: true, message: '创建成功', data: diary });
  } catch (err) {
    console.error('Create diary error:', err);
    res.status(500).json({ success: false, message: '创建日记失败' });
  }
});

// PUT /api/diaries/:id
router.put('/:id', rejectGuest, async (req, res) => {
  try {
    const diaryId = parseInt(req.params.id);
    const existing = await prisma.diary.findFirst({
      where: { id: diaryId, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '日记不存在' });
    }

    const { title, content, mood, weather, isPublic, date } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (mood !== undefined) data.mood = mood;
    if (weather !== undefined) data.weather = weather;
    if (isPublic !== undefined) data.isPublic = isPublic;
    if (date !== undefined) data.date = new Date(date);

    const diary = await prisma.diary.update({
      where: { id: diaryId },
      data,
    });

    res.json({ success: true, message: '更新成功', data: diary });
  } catch (err) {
    console.error('Update diary error:', err);
    res.status(500).json({ success: false, message: '更新日记失败' });
  }
});

// DELETE /api/diaries/:id
router.delete('/:id', rejectGuest, async (req, res) => {
  try {
    const diaryId = parseInt(req.params.id);
    const existing = await prisma.diary.findFirst({
      where: { id: diaryId, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '日记不存在' });
    }

    await prisma.diary.delete({ where: { id: diaryId } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('Delete diary error:', err);
    res.status(500).json({ success: false, message: '删除日记失败' });
  }
});

export default router;
