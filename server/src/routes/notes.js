import { Router } from 'express';
import { prisma } from '../index.js';
import auth, { rejectGuest } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// GET /api/notes - List notes (supports search via q param)
router.get('/', async (req, res) => {
  try {
    const { q, tags } = req.query;
    const where = { userId: req.userId };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (tags) {
      where.tags = { contains: tags, mode: 'insensitive' };
    }

    const notes = await prisma.note.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: notes });
  } catch (err) {
    console.error('Get notes error:', err);
    res.status(500).json({ success: false, message: '获取笔记列表失败' });
  }
});

// POST /api/notes - Create note
router.post('/', rejectGuest, async (req, res) => {
  try {
    const { title, content, tags, isPublic } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: '标题不能为空' });
    }

    const note = await prisma.note.create({
      data: {
        userId: req.userId,
        title,
        content,
        tags: tags || null,
        isPublic: isPublic || false,
      },
    });

    // 奖励积分：创建笔记 +8，内容每100字额外+3
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
        source: 'note_create',
        referenceId: String(note.id),
        remark: `创建笔记「${title}」${content?.length ? `(${content.length}字)` : ''}`,
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

    res.status(201).json({ success: true, message: '创建成功', data: note });
  } catch (err) {
    console.error('Create note error:', err);
    res.status(500).json({ success: false, message: '创建笔记失败' });
  }
});

// PUT /api/notes/:id
router.put('/:id', rejectGuest, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    const existing = await prisma.note.findFirst({
      where: { id: noteId, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '笔记不存在' });
    }

    const { title, content, tags, isPublic } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (tags !== undefined) data.tags = tags;
    if (isPublic !== undefined) data.isPublic = isPublic;

    const note = await prisma.note.update({
      where: { id: noteId },
      data,
    });

    res.json({ success: true, message: '更新成功', data: note });
  } catch (err) {
    console.error('Update note error:', err);
    res.status(500).json({ success: false, message: '更新笔记失败' });
  }
});

// DELETE /api/notes/:id
router.delete('/:id', rejectGuest, async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    const existing = await prisma.note.findFirst({
      where: { id: noteId, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '笔记不存在' });
    }

    await prisma.note.delete({ where: { id: noteId } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ success: false, message: '删除笔记失败' });
  }
});

export default router;
