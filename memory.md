# 2026-05-26 日志

## LearnHub 个人学习平台 — 项目启动

### 已完成
- **项目架构设计**：完整的技术选型（Vue3+TS+Pinia / Express+Prisma+PostgreSQL / Docker Compose）
- **8大功能模块规划**：番茄钟、待办、笔记、日记、打卡、积分等级、商城、个人中心
- **后端代码全部完成**（3400+行）：17个文件
  - Prisma schema（10张表：user/task/pomodoro/note/diary/checkin/pointsLog/shopItem/order/achievement/notification）
  - 完整 API（auth/tasks/pomodoro/notes/diaries/checkins/rewards/shop/notifications）
  - JWT 鉴权 + 路由守卫
  - WebSocket 实时通知
  - node-cron 定时任务
- **前端代码全部完成**（5500+行）：18个源文件（含已构建的 dist）
  - GitHub 暗色主题，登录/注册、侧边栏导航、9个功能页面
  - 路由守卫 + 401 拦截自动跳登录
  - API 封装 + Pinia 状态管理
- **Docker 部署成功**：3个容器运行中
  - learnhub-db (PostgreSQL 16) 🟢
  - learnhub-server (Express API) 🟢
  - learnhub-web (Nginx + Vue3 SPA) 🟢
- **API 全部验证通过**：注册、登录、JWT 鉴权、CRUD

### 端口
- 8080 → 前端页面
- 3000 → 后端 API
- 5432 → PostgreSQL

### 默认账号
- admin / 123456

### 待做
- [ ] 配置 Nginx 统一入口（替代现有 3001/3002/3003）
- [ ] 开发阶段2-6的更多功能细节
- [ ] WebSocket 实时提醒集成
