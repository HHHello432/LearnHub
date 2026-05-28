# 🏗️ LearnHub 架构设计文档

> 版本：v1.0 | 最后更新：2026-05-28

---

## 1. 系统架构概述

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                    用户浏览器                             │
│               Vue 3 SPA（单页应用）                       │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│   │Dashboard│Pomodoro│Tasks │Notes │Shop  │  ...        │
│   └──┬───┘ └──┬───┘ └──┬──┘ └──┬──┘ └──┬──┘          │
│      └────────┴────────┴───┴────┴───────┤               │
│                    Axios HTTP            │               │
└──────────────────────────────────────────┼───────────────┘
                                           │ HTTP /api/*
                                           │ Authorization: Bearer
                                           ▼
┌──────────────────────────────────────────────────────────┐
│                  Nginx （80端口）                          │
│           /api/* → proxy_pass :3000                      │
│               其他 → 静态文件                             │
└──────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────┐
│                Express API Server（3000端口）              │
│                                                          │
│   ┌───────────┐  ┌───────────┐  ┌───────────────┐       │
│   │ CORS      │  │ JSON Parser│  │ JWT Auth MW    │       │
│   └───────────┘  └───────────┘  └───────┬───────┘       │
│                                          │                │
│   ┌──────────────────────────────────────▼────────────┐  │
│   │              路由模块                              │  │
│   │  /auth  /tasks  /pomodoro  /notes  /diaries       │  │
│   │  /checkins  /rewards  /shop  /notifications       │  │
│   │  /invite-codes  /settings                         │  │
│   └──────────────────────┬───────────────────────────┘  │
│                          │                               │
│   ┌──────────────────────▼───────────────────────────┐  │
│   │           Prisma ORM                              │  │
│   │           Query → Model → Migration               │  │
│   └──────────────────────┬───────────────────────────┘  │
└──────────────────────────┼────────────────────────────┘
                           │ TCP :5432
                           ▼
┌──────────────────────────────────────────────────────────┐
│              PostgreSQL 16 数据库                          │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                    │
│   │ User │ │ Task │ │ Note │ │Order │  ... 12 tables    │
│   └──────┘ └──────┘ └──────┘ └──────┘                    │
└──────────────────────────────────────────────────────────┘
```

### 1.2 部署架构

```
┌────────── Docker Compose ──────────┐
│                                     │
│  ┌───────────┐  ┌───────────────┐  │
│  │  postgres  │  │    server     │  │
│  │    :5432   │◀─┤   Node.js     │  │
│  │  PostgreSQL│  │    :3000      │  │
│  └───────────┘  └───────┬───────┘  │
│                         │          │
│                 ┌───────▼───────┐  │
│                 │     web       │  │
│                 │   Nginx :80   │  │
│                 └───────────────┘  │
└────────────────────────────────────┘
```

---

## 2. 前端架构

### 2.1 技术选型

| 技术 | 版本 | 选型理由 |
|------|------|---------|
| Vue 3 | 3.4+ | Composition API + TypeScript 原生支持 |
| TypeScript | 5.x | 类型安全，降低运行时错误 |
| Vite | 5.x | 极速 HMR，构建性能优秀 |
| Axios | 1.x | 请求/响应拦截器，统一错误处理 |
| Pinia | 2.x | 精简的状态管理，Vue 3 官方推荐 |
| Vue Router | 4.x | 动态路由，路由守卫 |

### 2.2 路由结构

```
/login              → 登录/注册页面
/                    → 首页仪表盘 (Dashboard)
/pomodoro            → 番茄钟专注
/tasks               → 四象限待办
/notes               → 笔记
/diaries             → 日记
/checkins            → 习惯打卡
/shop                → 积分商城
/profile             → 个人中心
/admin/shop          → 商品管理 (管理员)
/admin/users         → 用户管理 (管理员)
/admin/invite-codes  → 邀请码管理 (管理员)
/admin/settings      → 系统设置 (管理员)
```

### 2.3 状态管理

```
Pinia Store (auth)
├── user          → 当前用户信息
├── isLoggedIn    → 登录状态
├── isGuest       → 游客状态
├── token         → JWT Token
├── login()       → 登录/保存 Token 到 localStorage
└── logout()      → 清除 Token 并跳转
```

### 2.4 组件树

```
App.vue
├── Sidebar.vue          → 抽屉式侧边导航（含管理菜单区）
├── TopBar.vue           → 顶部栏 + 通知图标
├── GuestModal.vue       → 访客操作提示弹窗
├── Login.vue            → 登录/注册页面
└── Router View
    ├── Dashboard.vue    → 首页四格统计 + 笔记/待办预览
    ├── Pomodoro.vue     → 番茄钟 + 今日统计 + 历史弹窗
    ├── Tasks.vue        → 四象限 + 待办卡片
    ├── Notes.vue        → Markdown 编辑器 + 列表
    ├── Diaries.vue      → 日记列表 + 编辑器
    ├── Checkins.vue     → 习惯管理 + 日历热力图
    ├── Shop.vue         → 商品列表 + 兑换记录
    ├── Profile.vue      → 用户信息 + 积分等级
    ├── AdminShop.vue    → 商品 CRUD
    ├── AdminUsers.vue   → 用户管理列表
    ├── AdminInviteCodes.vue → 邀请码生成/删除
    └── AdminSettings.vue → 系统参数设置
```

### 2.5 API 封装层

```
api/index.ts
├── axios 实例 (baseURL /api, 统一拦截器)
├── setRouter()          → 注入路由实例（401跳转）
├── authApi              → 登录/注册/用户管理
├── tasksApi             → 待办 CRUD
├── pomodoroApi          → 番茄钟 + 统计
├── notesApi             → 笔记 CRUD
├── diariesApi           → 日记 CRUD
├── checkinsApi          → 打卡 + 统计
├── rewardsApi           → 积分/等级
├── inviteApi            → 邀请码验证
└── shopApi              → 商品/兑换
```

---

## 3. 后端架构

### 3.1 技术选型

| 技术 | 版本 | 选型理由 |
|------|------|---------|
| Node.js | 22 | 高性能、事件驱动非阻塞 I/O |
| Express | 4.x | 成熟稳定、中间件生态丰富 |
| Prisma | 6.x | 类型安全的 ORM、自动迁移 |
| PostgreSQL | 16 | ACID 事务、JSON 支持 |
| JWT | jsonwebtoken | 无状态认证 |
| bcryptjs | 纯 JS | 密码哈希，零原生依赖 |

### 3.2 中间件链

```
请求到达 → CORS → JSON Parser → 静态文件 → JWT Auth → 路由分发 → Prisma → 响应
                                                                  ↓
                                                         401 Token过期
                                                         403 权限不足
                                                         500 服务器错误
```

### 3.3 中间件详解

```javascript
// 1. JWT 认证中间件 (auth)
req.userId   → JWT 解码的用户 ID
req.userRole → JWT 解码的用户角色 (admin/user/guest)

// 2. 访客写保护 (rejectGuest)
req.userRole === 'guest' → 403 禁止写入

// 3. 管理员守卫 (requireAdmin)
req.userRole !== 'admin' → 403 仅管理员

// 4. 游客数据映射 (guestAsDemo)
req.userRole === 'guest' → req.userId 替换为演示账号 ID
```

---

## 4. 数据库架构

### 4.1 ER 图（关键关联）

```
InviteCode ──1:N── User ──1:N── Task
  (邀请码)          │            ├── PomodoroSession
                   │            ├── Note
                   │            ├── Diary
                   │            ├── Checkin
                   │            ├── PointsLog
                   │            ├── Order
                   │            ├── Achievement
                   │            └── Notification
                   │
              SystemSetting (独立表，key-value)
              ShopItem (独立表)

PointsLog ──N:1── User (积分流水关联用户)
Order ──N:1── User + ShopItem (订单关联用户和商品)
Checkin ──N:1── User (打卡记录关联用户，含独立积分值)
```

### 4.2 索引策略

| 表 | 索引字段 | 目的 |
|----|---------|------|
| `User` | username (UNIQUE) | 登录查询 |
| `Checkin` | (userId, date) | 按月查询打卡记录 |
| `Checkin` | habitName | 按习惯分组 |
| `PointsLog` | (userId, createdAt) | 按时间查询积分流水 |
| `Order` | (userId, createdAt) | 查询兑换记录 |
| `Task` | (userId, status) | 待办筛选 |

### 4.3 数据生命周期

```
用户注册 → 邀请码 usedCount++ → User 创建
用户注销 → 无级联删除（保留数据用于统计）
打卡创建 → PointsLog 同步写入
打卡删除 → 扣回对应积分
任务完成 → PointsLog 加分 + Order 校验积分
积分兑换 → PointsLog 扣分 + Order 创建
```

---

## 5. 安全架构

### 5.1 认证流程

```
用户登录 → POST /auth/login
         → bcrypt 验证密码
         → JWT.sign({userId, role}, secret, {expiresIn: '7d'})
         → 返回 token + user 信息

前端存储 → localStorage.setItem('learnhub_token', token)
         → Axios 请求拦截器添加 Authorization: Bearer

Token 刷新 → 过期后 401 → 前端 router.push('/login')
```

### 5.2 权限矩阵

```
                        No Auth    guest    user    admin
───────────────────────────────────────────────────────
POST /auth/register      ✅
POST /auth/login         ✅
GET  /api/*              ✅         ✅       ✅       ✅
POST/PUT/DELETE /api/*   ❌         ❌       ✅       ✅
/admin/*                 ❌         ❌       ❌       ✅
```

---

## 6. 异常处理

### 6.1 后端统一错误格式

```json
{
  "success": false,
  "message": "错误描述（中文）"
}
```

| HTTP 状态码 | 场景 |
|------------|------|
| 400 | 参数错误 / 业务校验失败 |
| 401 | 未登录 / Token 过期 |
| 403 | 权限不足（访客写入 / 非管理员） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 6.2 前端统一处理

```typescript
// Axios 响应拦截器
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Token 过期 → 清除存储 → 跳转登录
      localStorage.removeItem('learnhub_token')
      router.push('/login')
    }
    return Promise.reject(err)
  }
)
```

---

## 7. 部署架构

### 7.1 Docker Compose 配置

```yaml
services:
  postgres:     # PostgreSQL 16
    image: postgres:16-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck: { pg_isready }

  server:       # Express API
    build: ./server
    depends_on: [postgres (healthy)]
    command: sh -c "npx prisma db push && node src/index.js"

  web:          # Nginx + Vue SPA
    build: ./web
    depends_on: [server]
    ports: ["80:80"]
```

### 7.2 Nginx 配置

```nginx
server {
    listen 80;
    
    # API 反向代理
    location /api/ {
        proxy_pass http://server:3000;
        proxy_set_header Host $host;
    }
    
    # 前端 SPA
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 8. WebSocket 通知

```
连接：ws://host/ws?token=JWT_TOKEN
认证：查询参数传递 JWT Token

消息格式：
→ 服务器推送: { type: "notification", data: { ... } }

触发场景：
- 积分变动
- 新的通知消息
- 任务到期提醒
```

---

## 9. 开发规范

### 9.1 Git 分支策略

```
main ← 生产分支（只接受 PR）
  ↑
develop ← 开发主分支
  ↑
feature/auth   → 认证功能
feature/shop   → 商城功能
fix/checkin-xxx → Bug 修复
```

### 9.2 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| API 路径 | 蛇形复数 | `/api/checkins`, `/api/invite-codes` |
| 数据库表 | 蛇形 | `checkin`, `points_log`, `shop_item` |
| 前端组件 | PascalCase | `AdminShop.vue`, `Sidebar.vue` |
| 变量/函数 | camelCase | `fetchData()`, `userName` |
| API 方法 | RESTful | `GET /tasks`, `POST /checkins` |
