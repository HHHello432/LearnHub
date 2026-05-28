import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../index.js';
import auth, { requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/invite-codes/verify/:code — 验证邀请码信息（无需登录）
router.get('/verify/:code', async (req, res) => {
  try {
    const codeRecord = await prisma.inviteCode.findUnique({
      where: { code: req.params.code },
    });

    if (!codeRecord) {
      return res.status(404).json({ success: false, message: '邀请码不存在' });
    }

    const valid = codeRecord.isActive && codeRecord.usedCount < codeRecord.maxUses;

    res.json({
      success: true,
      data: {
        code: codeRecord.code,
        role: codeRecord.role,
        usedCount: codeRecord.usedCount,
        maxUses: codeRecord.maxUses,
        isActive: codeRecord.isActive,
        valid,
      },
    });
  } catch (err) {
    console.error('Verify invite code error:', err);
    res.status(500).json({ success: false, message: '验证邀请码失败' });
  }
});

// 以下路由需要认证 + 管理员权限
router.use(auth);
router.use(requireAdmin);

// GET /api/invite-codes — 获取所有邀请码
router.get('/', async (req, res) => {
  try {
    const codes = await prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true } },
      },
    });

    res.json({ success: true, data: codes });
  } catch (err) {
    console.error('Get invite codes error:', err);
    res.status(500).json({ success: false, message: '获取邀请码列表失败' });
  }
});

// POST /api/invite-codes — 创建邀请码
router.post('/', async (req, res) => {
  try {
    let { code, role, maxUses } = req.body;

    // 如果 code 为空则自动生成 8 位随机码
    if (!code || code.trim() === '') {
      code = crypto.randomBytes(4).toString('hex').toUpperCase();
    }

    const codeStr = code.trim().toUpperCase();

    // 检查是否已存在
    const existing = await prisma.inviteCode.findUnique({ where: { code: codeStr } });
    if (existing) {
      return res.status(409).json({ success: false, message: '邀请码已存在' });
    }

    const inviteCode = await prisma.inviteCode.create({
      data: {
        code: codeStr,
        role: role || 'user',
        maxUses: maxUses ? parseInt(maxUses) : 1,
        createdBy: req.userId,
      },
    });

    res.status(201).json({ success: true, message: '创建成功', data: inviteCode });
  } catch (err) {
    console.error('Create invite code error:', err);
    res.status(500).json({ success: false, message: '创建邀请码失败' });
  }
});

// DELETE /api/invite-codes/:id — 删除邀请码
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.inviteCode.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ success: false, message: '邀请码不存在' });
    }

    await prisma.inviteCode.delete({ where: { id } });
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('Delete invite code error:', err);
    res.status(500).json({ success: false, message: '删除邀请码失败' });
  }
});

export default router;
