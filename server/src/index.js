import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import pomodoroRoutes from './routes/pomodoro.js';
import noteRoutes from './routes/notes.js';
import diaryRoutes from './routes/diaries.js';
import checkinRoutes from './routes/checkins.js';
import rewardRoutes from './routes/rewards.js';
import shopRoutes from './routes/shop.js';
import notificationRoutes from './routes/notifications.js';
import inviteCodeRoutes from './routes/invite-codes.js';
import settingRoutes from './routes/settings.js';
import { setupWebSocket } from './ws.js';
import { verifyToken } from './middleware/auth.js';

export const prisma = new PrismaClient();

const app = express();
const server = createServer(app);

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/pomodoro', pomodoroRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/diaries', diaryRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invite-codes', inviteCodeRoutes);
app.use('/api/settings', settingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'LearnHub API is running' });
});

// WebSocket
const wss = setupWebSocket(server);

// Cron jobs — check every minute between 8:00-8:59
cron.schedule('* 8 * * *', async () => {
  console.log('[Cron] Running daily morning checks...');

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    // 1. Overdue task reminder
    const overdueTasks = await prisma.task.findMany({
      where: {
        status: 'todo',
        dueDate: { lt: todayEnd },
      },
      include: { user: true },
    });

    for (const task of overdueTasks) {
      await prisma.notification.create({
        data: {
          userId: task.userId,
          title: '待办即将到期',
          content: `你的待办「${task.title}」已过期或即将到期，请及时处理。`,
          type: 'task_reminder',
        },
      });
    }

    // 2. Checkin reminder — users who haven't checked in today
    const allUsers = await prisma.user.findMany();
    for (const user of allUsers) {
      const todayCheckin = await prisma.checkin.findFirst({
        where: {
          userId: user.id,
          date: { gte: todayStart, lt: todayEnd },
        },
      });

      if (!todayCheckin) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            title: '打卡提醒',
            content: '新的一天开始了，记得打卡哦！坚持就是胜利 💪',
            type: 'checkin_reminder',
          },
        });
      }
    }

    console.log(`[Cron] Done. Sent reminders for ${overdueTasks.length} overdue tasks.`);
  } catch (err) {
    console.error('[Cron] Error:', err.message);
  }
});

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LearnHub server running on port ${PORT}`);
});

export default app;
