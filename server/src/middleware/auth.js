import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'learnhub-secret';

export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

export const generateToken = (userId, role) => {
  return jwt.sign({ userId, role: role || 'user' }, JWT_SECRET, { expiresIn: '7d' });
};

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '未提供认证令牌' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '令牌已过期，请重新登录' });
    }
    return res.status(401).json({ success: false, message: '认证失败，无效的令牌' });
  }
};

// 禁止游客执行写操作
export const rejectGuest = (req, res, next) => {
  if (req.userRole === 'guest') {
    return res.status(403).json({ success: false, message: '游客账户无此权限' });
  }
  next();
};

// 仅管理员可访问
export const requireAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ success: false, message: '仅管理员可执行此操作' });
  }
  next();
};

/**
 * 游客读取中间件：将 guest 角色的 userId 替换为系统设置的演示账号
 */
export const guestAsDemo = async (req, res, next) => {
  if (req.userRole === 'guest') {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'guest_demo_user_id' },
      });
      if (setting) {
        req._originalUserId = req.userId;
        req.userId = parseInt(setting.value);
        req.isGuestViewingDemo = true;
      }
    } catch (err) {
      console.error('guestAsDemo error:', err);
    }
  }
  next();
};

export default auth;
