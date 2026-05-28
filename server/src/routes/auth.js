import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import auth, { generateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, nickname, inviteCode } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    if (!inviteCode) {
      return res.status(400).json({ success: false, message: '邀请码不能为空' });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(409).json({ success: false, message: '用户名已存在' });
    }

    // 查找并验证邀请码
    const codeRecord = await prisma.inviteCode.findUnique({
      where: { code: inviteCode },
    });

    if (!codeRecord) {
      return res.status(400).json({ success: false, message: '邀请码无效' });
    }

    if (!codeRecord.isActive) {
      return res.status(400).json({ success: false, message: '邀请码已被禁用' });
    }

    if (codeRecord.usedCount >= codeRecord.maxUses) {
      return res.status(400).json({ success: false, message: '邀请码已用完' });
    }

    // 更新邀请码使用次数（必须先更新 usedCount 再创建用户，用事务保证原子性）
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      // 增加使用次数
      await tx.inviteCode.update({
        where: { id: codeRecord.id },
        data: { usedCount: { increment: 1 } },
      });

      // 创建用户，角色继承自邀请码
      return tx.user.create({
        data: {
          username,
          password: hashedPassword,
          nickname: nickname || username,
          role: codeRecord.role,
          inviteCodeId: codeRecord.id,
        },
      });
    });

    const token = generateToken(user.id, user.role);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          level: user.level,
          exp: user.exp,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: '注册失败，请稍后重试' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const token = generateToken(user.id, user.role);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          level: user.level,
          exp: user.exp,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: '登录失败，请稍后重试' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        level: true,
        exp: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ success: false, message: '获取用户信息失败' });
  }
});

// GET /api/auth/role — 获取当前用户角色
// GET /api/auth/users - 管理员获取用户列表
router.get('/users', auth, requireAdmin, async (req, res) => {
  try {
    const { page = '1', limit = '20', search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { nickname: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          nickname: true,
          role: true,
          level: true,
          exp: true,
          isActive: true,
          createdAt: true,
          _count: { select: { tasks: true, notes: true, diaries: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: { users, total, page: parseInt(page), limit: take } });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ success: false, message: '获取用户列表失败' });
  }
});

// PUT /api/auth/users/:id/role - 管理员修改用户角色
router.put('/users/:id/role', auth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!['user', 'guest', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: '无效的角色' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    res.json({ success: true, message: '角色已更新', data: { id: user.id, role: user.role } });
  } catch (err) {
    console.error('Update user role error:', err);
    res.status(500).json({ success: false, message: '更新角色失败' });
  }
});

// PUT /api/auth/users/:id/toggle-active - 管理员禁用/启用用户
router.put('/users/:id/toggle-active', auth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });

    res.json({ success: true, message: updated.isActive ? '用户已启用' : '用户已禁用', data: { id: updated.id, isActive: updated.isActive } });
  } catch (err) {
    console.error('Toggle user active error:', err);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

router.get('/role', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, role: true, username: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({ success: true, data: { role: user.role } });
  } catch (err) {
    console.error('Get role error:', err);
    res.status(500).json({ success: false, message: '获取角色信息失败' });
  }
});

export default router;
