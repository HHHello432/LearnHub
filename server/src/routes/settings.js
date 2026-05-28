import { Router } from 'express';
import { prisma } from '../index.js';
import auth, { requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/settings - 获取系统设置
router.get('/', auth, async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const map = {};
    for (const s of settings) map[s.key] = s.value;
    res.json({ success: true, data: map });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ success: false, message: '获取设置失败' });
  }
});

// PUT /api/settings/:key - 更新系统设置
router.put('/:key', auth, requireAdmin, async (req, res) => {
  try {
    const { value } = req.body;
    await prisma.systemSetting.upsert({
      where: { key: req.params.key },
      update: { value: String(value) },
      create: { key: req.params.key, value: String(value) },
    });
    res.json({ success: true, message: '设置已更新' });
  } catch (err) {
    console.error('Update setting error:', err);
    res.status(500).json({ success: false, message: '更新设置失败' });
  }
});

// POST /api/settings/guest-demo - 设置游客演示账号
router.post('/guest-demo', auth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    await prisma.systemSetting.upsert({
      where: { key: 'guest_demo_user_id' },
      update: { value: String(userId) },
      create: { key: 'guest_demo_user_id', value: String(userId) },
    });
    res.json({ success: true, message: `游客演示账号已设为「${user.nickname || user.username}」` });
  } catch (err) {
    console.error('Set guest demo error:', err);
    res.status(500).json({ success: false, message: '设置失败' });
  }
});

export default router;
