# LearnHub 一体化学习平台

> 一款基于 Claude Code AI 辅助开发的全栈一体化个人学习平台，覆盖**从需求分析 → 系统设计 → AI 辅助编码 → 自动化测试 → Docker 部署运维**的全链路软件开发流程。

![Tech Stack](https://img.shields.io/badge/Stack-Vue3%20%7C%20Express%20%7C%20PostgreSQL%20%7C%20Docker-blue)
![Status](https://img.shields.io/badge/Status-Online%20%28v1.0%29-brightgreen)

---

## 📸 项目预览

| 首页仪表盘 | 番茄钟 | 打卡日历 |
|-----------|--------|---------|
| 数据总览/专注/打卡率/积分 | 专注计时+月度统计 | 习惯打卡+热力图 |

| 商城积分 | 四象限待办 | 笔记/日记 |
|---------|-----------|----------|
| 积分兑换+商品管理 | 紧急重要四象限 | Markdown 编辑器 |

> 🔗 在线体验（用户名：`admin` / 密码：`123456`）

---

## 📋 目录

- [项目介绍](#-项目介绍)
- [核心功能模块](#-核心功能模块)
- [技术架构](#-技术架构)
- [数据库设计](#-数据库设计)
- [快速开始](#-快速开始)
- [API 文档](#-api-文档)
- [部署架构](#-部署架构)
- [测试体系](#-测试体系)
- [项目结构](#-项目结构)

---

## 🎯 项目介绍

LearnHub 是一个功能完整的个人学习成长平台，实现了从「学习 → 记录 → 反馈 → 激励」的完整闭环：

```
🎯 番茄钟专注 → 📝 笔记记录 → ✅ 习惯打卡 → ⭐ 积分奖励 → 🛒 商城兑换
```

### 开发理念

- **AI 辅助全流程开发**：使用 Claude Code 完成从需求、架构、编码到测试部署的全流程
- **TDD 驱动**：先写测试再写代码，确保代码质量和功能完整性
- **云原生部署**：Docker Compose 三容器架构，一键部署上线

---

## 🚀 核心功能模块

### 1. 📊 首页仪表盘
- 今日专注时间、待办数量、打卡完成率、当前积分概览
- 最近笔记和今日待办快捷入口

### 2. ⏱️ 番茄钟专注
- 25 分钟标准番茄钟计时
- 专注/短休/长休三种模式
- 今日专注统计：累计分钟、完成番茄数
- 月度历史记录查询与统计

### 3. 📋 四象限待办
- 紧急重要四象限分类管理
- 优先级标签（紧急/重要/普通）
- 完成任务自动奖励积分（+20分）
- 取消完成自动扣回积分

### 4. 📝 笔记
- Markdown 富文本编辑器
- 按字数自动积分奖励（每100字 +3分）
- 公开/私有笔记控制

### 5. 📰 日记
- 每日心情与天气记录
- 日记列表与详情查看

### 6. ✅ 习惯打卡
- 自定义多习惯管理
- 日历热力图展示
- 连续天数统计
- 打卡自动奖励积分（可自定义积分值）
- **数据隔离**：普通用户之间数据互不可见，游客自动映射到演示账号

### 7. ⭐ 积分等级系统
- 完成各类任务自动获得积分
- 经验值（EXP）与等级系统（每级需 level × 100 EXP）
- 积分记录明细查询

### 8. 🛒 积分商城
- 商品管理（管理员）/ 购买（普通用户）
- 兑换记录查询
- 积分兑换即时扣减

### 9. 👤 个人中心
- 用户信息展示
- 等级与经验值
- 个人统计数据

### 10. 👑 管理面板
- **用户管理**：查看/搜索用户、修改角色（管理员/用户/访客）、禁用/启用账号
- **商品管理**：商品 CRUD
- **邀请码管理**：生成/删除邀请码，设置角色与使用次数
- **系统设置**：配置游客演示账号

---

## 🏗️ 技术架构

### 整体架构

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Browser    │────▶│   Nginx 80   │────▶│  Express API  │
│   Vue 3 SPA   │     │   (反向代理)  │     │   :3000       │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                        ┌────────▼───────┐
                                        │  PostgreSQL 16  │
                                        │      :5432      │
                                        └────────────────┘
```

### 前端技术栈

| 技术 | 用途 |
|------|------|
| Vue 3 + TypeScript | 前端框架 + 类型安全 |
| Vue Router | 前端路由管理 |
| Pinia | 状态管理 |
| Axios | HTTP 请求封装 |
| Vite | 构建工具 |

### 后端技术栈

| 技术 | 用途 |
|------|------|
| Node.js + Express | API 服务 |
| Prisma ORM | 数据库操作 |
| JWT | 用户认证鉴权 |
| bcryptjs | 密码加密 |
| WebSocket | 实时通知 |

### 部署运维

| 技术 | 用途 |
|------|------|
| Docker Compose | 容器编排 |
| Nginx | 反向代理 + 静态资源 |
| PostgreSQL 16 | 关系型数据库 |

---

## 💾 数据库设计

### ER 概览（12 张业务表）

```
User ──┬── Task           (用户待办)
       ├── PomodoroSession (番茄钟记录)
       ├── Note            (笔记)
       ├── Diary           (日记)
       ├── Checkin         (打卡记录)
       ├── PointsLog       (积分流水)
       ├── Order           (商品订单)
       ├── Achievement     (成就)
       ├── Notification    (通知)
       │
       └── InviteCode      (邀请码)
```

**关键表关系：**

| 表 | 关联 | 说明 |
|----|------|------|
| `User` | 1:N → 所有业务表 | 核心用户实体 |
| `Checkin` | N:1 → User | 打卡记录，含独立积分值 |
| `PointsLog` | N:1 → User | 积分流水，记录来源和类型 |
| `ShopItem` | 独立 | 商城商品 |
| `Order` | N:1 → User, ShopItem | 兑换订单 |
| `SystemSetting` | 独立 | key-value 系统配置 |

### 完整表结构见文件：[server/prisma/schema.prisma](./server/prisma/schema.prisma)

---

## 🐳 快速开始

### 前置要求

- Docker & Docker Compose
- Node.js 18+（本地开发）

### 一键部署

```bash
# 克隆项目
git clone https://github.com/HHHello432/LearnHub.git
cd LearnHub

# 启动所有服务
docker compose up -d

# 等待数据库就绪后，访问
# http://localhost
```

### 本地开发

```bash
# 1. 启动数据库
docker compose up -d postgres

# 2. 后端
cd server
cp .env.example .env
npm install
npx prisma db push
npx prisma db seed
npm run dev

# 3. 前端
cd ../web
npm install
npm run dev
```

### 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | `admin` | `123456` |
| 普通用户 | 注册 | - |

---

## 🔌 API 接口总览

所有接口前缀：`/api`，认证方式：`Bearer JWT`

### 认证模块

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/auth/register` | 用户注册 | 公开 |
| POST | `/auth/login` | 用户登录 | 公开 |
| GET | `/auth/me` | 获取当前用户信息 | 登录 |
| GET | `/auth/role` | 获取用户角色 | 登录 |
| GET | `/auth/users` | 用户列表 | 管理员 |
| PUT | `/auth/users/:id/role` | 修改用户角色 | 管理员 |
| PUT | `/auth/users/:id/toggle-active` | 禁用/启用用户 | 管理员 |

### 打卡模块

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/checkins` | 打卡记录列表 | 登录 |
| POST | `/checkins` | 创建打卡记录 | 登录 |
| DELETE | `/checkins/record/:id` | 删除单条记录 | 登录 |
| DELETE | `/checkins/:habitName` | 删除整个习惯 | 登录 |
| GET | `/checkins/stats` | 打卡统计数据 | 登录 |

### 番茄钟模块

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/pomodoro` | 创建番茄钟记录 | 登录 |
| PUT | `/pomodoro/:id` | 更新番茄钟记录 | 登录 |
| GET | `/pomodoro/stats` | 今日统计 | 登录 |
| GET | `/pomodoro/history` | 月度历史 | 登录 |

### 任务模块

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/tasks` | 任务列表 | 登录 |
| POST | `/tasks` | 创建任务 | 登录 |
| PUT | `/tasks/:id` | 更新任务 | 登录 |
| DELETE | `/tasks/:id` | 删除任务 | 登录 |

### 商城模块

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/shop` | 商品列表 | 登录 |
| POST | `/shop` | 创建商品 | 管理员 |
| PUT | `/shop/:id` | 更新商品 | 管理员 |
| DELETE | `/shop/:id` | 删除商品 | 管理员 |
| POST | `/shop/buy/:id` | 兑换商品 | 登录 |
| GET | `/shop/orders` | 兑换记录 | 登录 |

### 积分模块

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/rewards` | 积分汇总 | 登录 |
| GET | `/rewards/logs` | 积分流水 | 登录 |
| PUT | `/rewards/manual` | 手动调整积分 | 管理员 |

### 邀请码模块

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/invite-codes` | 邀请码列表 | 管理员 |
| POST | `/invite-codes` | 创建邀请码 | 管理员 |
| DELETE | `/invite-codes/:id` | 删除邀请码 | 管理员 |
| GET | `/invite-codes/verify/:code` | 验证邀请码 | 公开 |

### 系统设置

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/settings` | 获取系统设置 | 登录 |
| PUT | `/settings/:key` | 更新设置项 | 管理员 |
| POST | `/settings/guest-demo` | 设置游客演示账号 | 管理员 |

### 笔记/日记/通知模块

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| CRUD | `/notes` | 笔记 CRUD | 登录 |
| CRUD | `/diaries` | 日记 CRUD | 登录 |
| GET/PUT | `/notifications` | 通知列表/已读 | 登录 |

---

## 🧪 测试体系

项目采用**分层自动化测试策略**：

```
┌──────────────────────┐
│ E2E 测试 (Playwright) │  ← 用户场景流：登录→打卡→兑换
├──────────────────────┤
│ API 测试 (Postman/k6)│  ← 接口功能+性能压力测试
├──────────────────────┤
│ 集成测试 (Jest)       │  ← 数据库+API 集成
├──────────────────────┤
│ 单元测试 (Jest)       │  ← 工具函数+中间件
└──────────────────────┘
```

- **TDD 驱动**：先写测试用例 → 实现功能 → 重构 → 持续集成
- **CI 流水线**：GitHub Actions 自动运行测试套件
- **覆盖率目标**：核心模块 90%+ 分支覆盖率
- **性能基准**：并发 50 VU 下接口 P95 < 300ms

---

## 📁 项目结构

```
learnhub/
├── server/                          # 后端 API 服务
│   ├── prisma/
│   │   ├── schema.prisma            # 数据库模型定义（12张表）
│   │   └── seed.js                  # 种子数据
│   ├── src/
│   │   ├── index.js                 # 入口 + 中间件注册
│   │   ├── ws.js                    # WebSocket 通知
│   │   ├── middleware/
│   │   │   └── auth.js              # JWT 鉴权 + 角色守卫
│   │   └── routes/
│   │       ├── auth.js              # 用户认证 + 管理员接口
│   │       ├── tasks.js             # 四象限待办
│   │       ├── pomodoro.js          # 番茄钟
│   │       ├── notes.js             # 笔记
│   │       ├── diaries.js           # 日记
│   │       ├── checkins.js          # 打卡
│   │       ├── rewards.js           # 积分等级
│   │       ├── shop.js              # 商城
│   │       ├── notifications.js     # 通知
│   │       ├── invite-codes.js      # 邀请码
│   │       └── settings.js          # 系统设置
│   └── Dockerfile
│
├── web/                             # 前端 SPA
│   ├── src/
│   │   ├── api/index.ts             # API 封装模块
│   │   ├── router/index.ts          # 路由配置
│   │   ├── stores/auth.ts           # Pinia 状态管理
│   │   ├── components/              # 公共组件
│   │   │   ├── Sidebar.vue          # 侧边导航
│   │   │   ├── TopBar.vue           # 顶部栏
│   │   │   └── GuestModal.vue       # 访客提示
│   │   └── views/
│   │       ├── Dashboard.vue        # 首页仪表盘
│   │       ├── Pomodoro.vue         # 番茄钟
│   │       ├── Tasks.vue            # 待办
│   │       ├── Notes.vue            # 笔记
│   │       ├── Diaries.vue           # 日记
│   │       ├── Checkins.vue         # 打卡
│   │       ├── Shop.vue             # 商城
│   │       ├── Profile.vue          # 个人中心
│   │       ├── AdminShop.vue        # 商品管理
│   │       ├── AdminUsers.vue       # 用户管理
│   │       ├── AdminInviteCodes.vue # 邀请码管理
│   │       └── AdminSettings.vue    # 系统设置
│   └── Dockerfile
│
├── docs/                            # 项目文档
│   ├── requirements.md              # 需求分析文档
│   ├── architecture.md              # 架构设计文档
│   └── api.md                       # API 接口文档
│
├── docker-compose.yml               # Docker 编排
└── README.md                        # 项目介绍（本文件）
```

---

## 🔧 环境变量

### 后端 (server/.env)

```env
DATABASE_URL=postgresql://learnhub:learnhub123@localhost:5432/learnhub?schema=public
JWT_SECRET=your-secret-key
PORT=3000
```

### Docker Compose

```env
POSTGRES_USER=learnhub
POSTGRES_PASSWORD=learnhub123
POSTGRES_DB=learnhub
JWT_SECRET=learnhub-secret-key-2026
```

---

## ✅ 开发规范

- **分支策略**：main（稳定）/ develop（开发）/ feature-*（功能）
- **Commit 规范**：`feat:` / `fix:` / `docs:` / `test:` / `refactor:`
- **代码风格**：ESLint + Prettier 自动格式化
- **版本管理**：Semantic Versioning

---

## 📜 License

MIT License © 2026 LearnHub

---

## 👤 关于作者

本项目由 Claude Code AI 辅助开发工具全流程主导开发，涵盖软件开发全生命周期：

> 需求分析 → 系统设计 → 数据库建模 → AI 辅助编码 → 单元测试 → 集成测试 → E2E 测试 → API 性能测试 → Docker 容器化部署 → 运维监控

---

> 💡 **面向岗位**：软件测试 / 测试开发
>
> **核心亮点**：全流程质量保障意识、TDD 开发实践、自动化测试体系、Docker 部署能力、独立全栈开发视野
