# 🔌 LearnHub API 接口文档

> 版本：v1.0 | 基础路径：`/api` | 认证方式：`Bearer Token`

---

## 通用规范

### 请求格式
- Content-Type：`application/json`
- 认证头：`Authorization: Bearer <token>`

### 响应格式

**成功响应：**
```json
{
  "success": true,
  "data": { ... },       // 可选，返回数据
  "message": "操作成功"   // 可选，操作提示
}
```

**失败响应：**
```json
{
  "success": false,
  "message": "错误描述"
}
```

### 状态码

| 状态码 | 含义 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 参数错误 |
| 401 | 未认证 / Token 过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

### 权限标识

| 标识 | 含义 |
|------|------|
| 🔓 | 公开接口（无需 Token） |
| 🔐 | 登录用户 |
| 🔒 | 管理员 |

---

# 📁 认证模块 `/auth`

## POST /auth/register — 用户注册 🔓

**请求体：**
```json
{
  "username": "string (必填, 3-20字符)",
  "password": "string (必填, 6-20字符)",
  "nickname": "string (可选)",
  "inviteCode": "string (必填, 邀请码)"
}
```

**成功响应：**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "user": {
      "id": 1,
      "username": "user",
      "nickname": "用户昵称",
      "role": "user"
    }
  }
}
```

**错误场景：**
- 400: 用户名已存在 / 邀请码无效 / 邀请码已用完

---

## POST /auth/login — 用户登录 🔓

**请求体：**
```json
{
  "username": "string",
  "password": "string"
}
```

**成功响应：**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "user": {
      "id": 1, "username": "admin", "role": "admin",
      "level": 4, "exp": 58, "points": 322
    }
  }
}
```

---

## GET /auth/me — 获取当前用户信息 🔐

**响应：**
```json
{
  "success": true,
  "data": {
    "id": 1, "username": "admin", "nickname": "管理员",
    "role": "admin", "level": 4, "exp": 58,
    "points": 322, "tasks": 12, "notes": 5, "diaries": 1
  }
}
```

---

## GET /auth/role — 获取用户角色 🔐

**响应：**
```json
{ "success": true, "data": { "role": "admin" } }
```

---

## GET /auth/users — 用户列表 🔒

**查询参数：**
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| page | int | 1 | 页码 |
| limit | int | 20 | 每页条数 |
| search | string | - | 用户名搜索 |

**响应：**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1, "username": "admin", "nickname": "管理员",
        "role": "admin", "level": 4, "exp": 58,
        "isActive": true,
        "createdAt": "2026-05-26T...",
        "_count": { "tasks": 12, "notes": 5, "diaries": 1 }
      }
    ],
    "total": 10,
    "page": 1,
    "limit": 20
  }
}
```

---

## PUT /auth/users/:id/role — 修改用户角色 🔒

**请求体：**
```json
{ "role": "user" | "guest" | "admin" }
```

---

## PUT /auth/users/:id/toggle-active — 禁用/启用用户 🔒

**响应：**
```json
{ "success": true, "data": { "id": 2, "isActive": false } }
```

---

# 📁 打卡模块 `/checkins`

## GET /checkins — 打卡记录列表 🔐

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| month | string | 月份筛选，如 `2026-05` |
| habitName | string | 按习惯名筛选 |

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "habitName": "跑步",
      "date": "2026-05-28T00:00:00.000Z",
      "status": "done",
      "streakCount": 5,
      "points": 5
    }
  ]
}
```

---

## POST /checkins — 创建打卡 🔐

**请求体：**
```json
{
  "habitName": "string (必填)",
  "date": "string (可选, 默认今天)",
  "status": "string (可选, 默认done)",
  "points": "number (可选, 默认5)"
}
```

**响应：**
```json
{ "success": true, "message": "打卡成功", "data": { ... } }
```

---

## DELETE /checkins/record/:id — 删除打卡记录 🔐

自动扣回积分并记录流水。

---

## DELETE /checkins/:habitName — 删除整个习惯 🔐

删除该习惯的所有打卡记录。

---

## GET /checkins/stats — 打卡统计 🔐

**响应：**
```json
{
  "success": true,
  "data": {
    "totalHabits": 2,
    "month": "2026-05",
    "habits": {
      "跑步": {
        "habitName": "跑步",
        "totalDays": 3,
        "currentStreak": 3,
        "records": [
          { "date": "2026-05-28", "status": "done", "streakCount": 3 }
        ]
      }
    }
  }
}
```

---

# 📁 番茄钟模块 `/pomodoro`

## POST /pomodoro — 创建番茄钟记录 🔐

**请求体：**
```json
{
  "durationPlanned": 25,
  "durationActual": 25,
  "type": "focus" | "shortBreak" | "longBreak",
  "status": "completed" | "interrupted"
}
```

---

## PUT /pomodoro/:id — 更新番茄钟记录 🔐

---

## GET /pomodoro/stats — 今日统计 🔐

**响应：**
```json
{
  "success": true,
  "data": {
    "todayTotalMinutes": 27,
    "todayCompletedSessions": 1,
    "weeklyData": [...]
  }
}
```

---

## GET /pomodoro/history?year=2026&month=5 — 月度历史 🔐

**响应：**
```json
{
  "success": true,
  "data": {
    "year": 2026,
    "month": 5,
    "totalMinutes": 120,
    "totalSessions": 5,
    "dailyRecords": [
      { "date": "2026-05-28", "totalMinutes": 27, "sessions": 1 }
    ]
  }
}
```

---

# 📁 任务模块 `/tasks`

## GET /tasks — 任务列表 🔐

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | `pending` / `done` / `all` |
| category | string | `urgent_important` / `not_urgent_important` / `urgent_not_important` / `not_urgent_not_important` |

---

## POST /tasks — 创建任务 🔐

**请求体：**
```json
{
  "title": "string (必填)",
  "description": "string",
  "priority": "urgent" | "important" | "normal",
  "category": "urgent_important" | "not_urgent_important" | "urgent_not_important" | "not_urgent_not_important",
  "pointsReward": 20
}
```

---

## PUT /tasks/:id — 更新任务 🔐

**额外逻辑：** `status` 从 `done` → `todo` 时自动扣回积分

---

# 📁 笔记模块 `/notes`

## CRUD 笔记

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /notes | 笔记列表 |
| POST | /notes | 创建笔记 |
| GET | /notes/:id | 查看笔记 |
| PUT | /notes/:id | 更新笔记 |
| DELETE | /notes/:id | 删除笔记 |

**POST/PUT 请求体：**
```json
{
  "title": "笔记标题",
  "content": "Markdown 内容",
  "isPublic": false
}
```

**积分规则：** 每 100 字 +3 分，每日上限 30 分

---

# 📁 日记模块 `/diaries`

## CRUD 日记

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /diaries | 日记列表 |
| POST | /diaries | 创建日记 |
| GET | /diaries/:id | 查看日记 |
| PUT | /diaries/:id | 更新日记 |
| DELETE | /diaries/:id | 删除日记 |

**请求体：**
```json
{
  "title": "日记标题",
  "content": "内容",
  "mood": "开心",
  "weather": "晴",
  "isPublic": false,
  "date": "2026-05-28"
}
```

---

# 📁 积分模块 `/rewards`

## GET /rewards — 积分汇总 🔐

**响应：**
```json
{
  "success": true,
  "data": {
    "balance": 322,
    "totalEarned": 500,
    "totalSpent": 178,
    "level": 4,
    "exp": 58,
    "nextLevelExp": 400
  }
}
```

---

## GET /rewards/logs — 积分流水 🔐

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| source | string | 筛选来源：`checkin` / `task` / `note` / `pomodoro` / `shop` |
| type | string | `earn` / `spend` / `deduct` |

---

## PUT /rewards/manual — 手动调整积分 🔒

```json
{ "userId": 2, "points": 50, "remark": "奖励" }
```

---

# 📁 商城模块 `/shop`

## GET /shop — 商品列表 🔐

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| all | boolean | 管理员：是否显示全部商品（包括下架） |

---

## POST /shop — 创建商品 🔒

```json
{
  "name": "商品名称",
  "description": "商品描述",
  "imageUrl": "https://...",
  "price": 100,
  "stock": 10
}
```

---

## PUT /shop/:id — 更新商品 🔒

---

## DELETE /shop/:id — 删除商品 🔒

---

## POST /shop/buy/:id — 兑换商品 🔐

自动扣减积分，创建订单，扣减库存。

**响应：**
```json
{ "success": true, "message": "兑换成功"}
```

---

## GET /shop/orders — 兑换记录 🔐

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 1,
      "itemId": 2,
      "pointsSpent": 100,
      "status": "completed",
      "createdAt": "2026-05-28T...",
      "item": { "name": "商品名" }
    }
  ]
}
```

---

# 📁 邀请码模块 `/invite-codes`

## GET /invite-codes — 邀请码列表 🔒

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1, "code": "ADMIN2026",
      "role": "user", "maxUses": 5,
      "usedCount": 2, "isActive": true,
      "createdAt": "2026-05-26T..."
    }
  ]
}
```

---

## POST /invite-codes — 创建邀请码 🔒

```json
{
  "code": "CUSTOM_CODE (可选, 留空自动生成)",
  "role": "user" | "guest",
  "maxUses": 5
}
```

---

## DELETE /invite-codes/:id — 删除邀请码 🔒

---

## GET /invite-codes/verify/:code — 验证邀请码 🔓

**响应：**
```json
{
  "success": true,
  "data": { "valid": true, "role": "user" }
}
```

---

# 📁 系统设置模块 `/settings`

## GET /settings — 获取所有设置 🔐

**响应：**
```json
{
  "success": true,
  "data": {
    "guest_demo_user_id": "2"
  }
}
```

---

## PUT /settings/:key — 更新设置项 🔒

```json
{ "value": "new_value" }
```

---

## POST /settings/guest-demo — 设置游客演示账号 🔒

```json
{ "userId": 2 }
```

**响应：**
```json
{ "success": true, "message": "游客演示账号已设为「测试游客」" }
```

---

# 📁 通知模块 `/notifications`

## GET /notifications — 通知列表 🔐

---

## PUT /notifications/:id/read — 标记已读 🔐

---

## PUT /notifications/read-all — 全部标记已读 🔐

---

# 💡 错误场景汇总

| 错误码 | 说明 | 处理方式 |
|--------|------|---------|
| 401 Token 过期 | JWT 过期 | 前端清除 Token，跳转登录页 |
| 403 游客写入 | 访客尝试写操作 | 弹出游客提示弹窗 |
| 403 权限不足 | 非管理员访问管理接口 | 前端隐藏管理入口 |
| 400 参数校验 | 必填参数缺失/格式错误 | 前端表单校验 + 后端提示 |
| 404 资源不存在 | 请求的资源不存在 | 前端 Toast 提示 |
| 500 服务器错误 | 内部异常 | 前端 Toast 提示，后端日志记录 |
