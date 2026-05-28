import { Router } from 'express';
import { prisma } from '../index.js';
import auth, { rejectGuest } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// 积分规则配置（硬编码，后续可改为数据库配置）
export const POINTS_RULES = {
  task_complete: 10,      // 完成一个待办
  checkin: 5,             // 打卡一次
  pomodoro: 15,           // 完成一个番茄钟
  note_create: 8,         // 创建一篇笔记
  note_content_100: 3,    // 笔记每满100字（仅首次创建时额外）
  diary_create: 8,        // 创建一篇日记
  diary_content_100: 3,   // 日记每满100字
};

// GET /api/shop/items - List shop items
router.get('/items', async (req, res) => {
  try {
    const { type, all } = req.query;
    const where = {};

    // 管理员传 all=true 查看全部（含下架），普通用户只看上架
    if (all === 'true') {
      // Check if admin
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user || user.role !== 'admin') {
        where.isActive = true;
      }
    } else {
      where.isActive = true;
    }

    if (type) where.type = type;

    const items = await prisma.shopItem.findMany({ where, orderBy: { createdAt: 'desc' } });

    // Get user's total points to show balance
    const pointsAgg = await prisma.pointsLog.aggregate({
      where: { userId: req.userId },
      _sum: { points: true },
    });

    res.json({
      success: true,
      data: {
        items,
        userPoints: pointsAgg._sum.points || 0,
      },
    });
  } catch (err) {
    console.error('Get shop items error:', err);
    res.status(500).json({ success: false, message: '获取商品列表失败' });
  }
});

// POST /api/shop/buy - Purchase item
router.post('/buy', rejectGuest, async (req, res) => {
  try {
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({ success: false, message: '商品ID不能为空' });
    }

    const item = await prisma.shopItem.findUnique({ where: { id: parseInt(itemId) } });
    if (!item) {
      return res.status(404).json({ success: false, message: '商品不存在' });
    }

    if (!item.isActive) {
      return res.status(400).json({ success: false, message: '商品已下架' });
    }

    // Check stock (stock -1 means unlimited)
    if (item.stock !== -1 && item.stock <= 0) {
      return res.status(400).json({ success: false, message: '商品库存不足' });
    }

    // Check user points
    const pointsAgg = await prisma.pointsLog.aggregate({
      where: { userId: req.userId },
      _sum: { points: true },
    });

    const userPoints = pointsAgg._sum.points || 0;
    if (userPoints < item.price) {
      return res.status(400).json({ success: false, message: '积分不足' });
    }

    // Create order and deduct points in transaction
    const [order] = await prisma.$transaction([
      prisma.order.create({
        data: {
          userId: req.userId,
          itemId: item.id,
          pointsSpent: item.price,
        },
        include: { item: true },
      }),
      prisma.pointsLog.create({
        data: {
          userId: req.userId,
          points: -item.price,
          type: 'spend',
          source: 'shop_purchase',
          referenceId: String(item.id),
          remark: `购买「${item.name}」`,
        },
      }),
    ]);

    // Update stock if limited (stock -1 means unlimited)
    if (item.stock !== -1) {
      await prisma.shopItem.update({
        where: { id: item.id },
        data: { stock: { decrement: 1 } },
      });
    }

    // Check achievement: first purchase
    const orderCount = await prisma.order.count({
      where: { userId: req.userId },
    });
    if (orderCount === 1) {
      const existingAchievement = await prisma.achievement.findFirst({
        where: { userId: req.userId, badgeName: '购物狂' },
      });
      if (!existingAchievement) {
        await prisma.achievement.create({
          data: {
            userId: req.userId,
            badgeName: '购物狂',
            badgeIcon: '🛒',
          },
        });
      }
    }

    res.status(201).json({ success: true, message: '购买成功', data: order });
  } catch (err) {
    console.error('Buy item error:', err);
    res.status(500).json({ success: false, message: '购买失败' });
  }
});

// GET /api/shop/orders - My orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.userId },
      include: { item: { select: { id: true, name: true, image: true, type: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ success: false, message: '获取订单列表失败' });
  }
});

// === 管理员接口 ===

// POST /api/shop/items - 管理员添加商品
router.post('/items', rejectGuest, async (req, res) => {
  try {
    // Check if user is admin
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '仅管理员可添加商品' });
    }

    const { name, description, price, stock, image, type } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: '名称和价格不能为空' });
    }

    const item = await prisma.shopItem.create({
      data: {
        name,
        description: description || null,
        price: parseInt(price),
        stock: stock !== undefined ? parseInt(stock) : -1,
        image: image || null,
        type: type || 'virtual',
      },
    });

    res.status(201).json({ success: true, message: '商品添加成功', data: item });
  } catch (err) {
    console.error('Create shop item error:', err);
    res.status(500).json({ success: false, message: '添加商品失败' });
  }
});

// PUT /api/shop/items/:id - 管理员编辑商品
router.put('/items/:id', rejectGuest, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '仅管理员可编辑商品' });
    }

    const itemId = parseInt(req.params.id);
    const { name, description, price, stock, image, isActive } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = parseInt(price);
    if (stock !== undefined) data.stock = parseInt(stock);
    if (image !== undefined) data.image = image;
    if (isActive !== undefined) data.isActive = isActive;

    const item = await prisma.shopItem.update({
      where: { id: itemId },
      data,
    });

    res.json({ success: true, message: '更新成功', data: item });
  } catch (err) {
    console.error('Update shop item error:', err);
    res.status(500).json({ success: false, message: '更新商品失败' });
  }
});

// DELETE /api/shop/items/:id - 管理员删除商品
router.delete('/items/:id', rejectGuest, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '仅管理员可删除商品' });
    }

    const itemId = parseInt(req.params.id);
    await prisma.shopItem.delete({ where: { id: itemId } });

    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('Delete shop item error:', err);
    res.status(500).json({ success: false, message: '删除商品失败' });
  }
});

// GET /api/shop/points-rules - 获取积分规则
router.get('/points-rules', async (req, res) => {
  res.json({ success: true, data: POINTS_RULES });
});

export default router;
