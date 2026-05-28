import { Router } from 'express';
import { prisma } from '../index.js';
import auth from '../middleware/auth.js';

const router = Router();
router.use(auth);

// GET /api/notifications - List notifications
router.get('/', async (req, res) => {
  try {
    const { limit, offset, unreadOnly } = req.query;
    const where = { userId: req.userId };

    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 50,
      skip: offset ? parseInt(offset) : 0,
    });

    const total = await prisma.notification.count({ where });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: { total, limit: parseInt(limit) || 50, offset: parseInt(offset) || 0 },
      },
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ success: false, message: '获取通知列表失败' });
  }
});

// PUT /api/notifications/:id/read - Mark as read
router.put('/:id/read', async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    const existing = await prisma.notification.findFirst({
      where: { id: noteId, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '通知不存在' });
    }

    const notification = await prisma.notification.update({
      where: { id: noteId },
      data: { isRead: true },
    });

    res.json({ success: true, message: '已标记为已读', data: notification });
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ success: false, message: '标记已读失败' });
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true, message: '全部已读' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ success: false, message: '操作失败' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.userId, isRead: false },
    });

    res.json({ success: true, data: { unreadCount: count } });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ success: false, message: '获取未读数量失败' });
  }
});

export default router;
