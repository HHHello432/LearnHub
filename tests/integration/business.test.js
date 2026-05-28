/**
 * 集成测试：核心业务 API
 *
 * 测试目标：任务 CRUD、番茄钟、积分、商城、邀请码
 */

const axios = require('axios')
const BASE = 'http://localhost:3000/api'

let adminToken = ''
let createdTaskId = null
let createdPomodoroId = null

beforeAll(async () => {
  const r = await axios.post(`${BASE}/auth/login`, { username: 'admin', password: '123456' })
  adminToken = r.data.data.token
})

describe('任务模块 /tasks', () => {
  test('POST /tasks - 创建任务', async () => {
    const r = await axios.post(`${BASE}/tasks`, {
      title: '自动化测试任务',
      category: 'urgent_important',
      priority: 'urgent',
      pointsReward: 20,
    }, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(r.data.success).toBe(true)
    createdTaskId = r.data.data?.id || r.data.data?.task?.id
    expect(createdTaskId).toBeDefined()
  })

  test('GET /tasks - 任务列表', async () => {
    const r = await axios.get(`${BASE}/tasks`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(r.data.success).toBe(true)
    expect(Array.isArray(r.data.data)).toBe(true)
  })

  test('PUT /tasks/:id - 完成任务（加分）', async () => {
    if (!createdTaskId) return
    const r = await axios.put(`${BASE}/tasks/${createdTaskId}`, {
      status: 'done',
    }, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(r.data.success).toBe(true)
  })

  test('PUT /tasks/:id - 取消完成（扣分）', async () => {
    if (!createdTaskId) return
    const r = await axios.put(`${BASE}/tasks/${createdTaskId}`, {
      status: 'todo',
    }, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(r.data.success).toBe(true)
  })

  test('DELETE /tasks/:id - 删除任务', async () => {
    if (!createdTaskId) return
    const r = await axios.delete(`${BASE}/tasks/${createdTaskId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(r.data.success).toBe(true)
  })
})

describe('番茄钟模块 /pomodoro', () => {
  test('POST /pomodoro - 创建番茄钟记录', async () => {
    const r = await axios.post(`${BASE}/pomodoro`, {
      durationPlanned: 25,
      durationActual: 25,
      type: 'focus',
      status: 'completed',
    }, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(r.data.success).toBe(true)
    createdPomodoroId = r.data.data?.id
  })

  test('GET /pomodoro/stats - 今日统计', async () => {
    const r = await axios.get(`${BASE}/pomodoro/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(r.data.success).toBe(true)
    expect(r.data.data).toHaveProperty('todayTotalMinutes')
  })

  test('GET /pomodoro/history - 月度历史', async () => {
    const r = await axios.get(`${BASE}/pomodoro/history?year=2026&month=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(r.data.success).toBe(true)
    expect(r.data.data).toHaveProperty('totalMinutes')
    expect(r.data.data).toHaveProperty('dailyRecords')
    expect(Array.isArray(r.data.data.dailyRecords)).toBe(true)
  })
})

describe('积分模块 /rewards', () => {
  test('GET /rewards - 积分汇总', async () => {
    const r = await axios.get(`${BASE}/rewards`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(r.data.success).toBe(true)
    expect(r.data.data).toHaveProperty('balance')
    expect(r.data.data).toHaveProperty('level')
    expect(typeof r.data.data.balance).toBe('number')
  })

  test('GET /rewards/logs - 积分流水', async () => {
    const r = await axios.get(`${BASE}/rewards/logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(r.data.success).toBe(true)
    expect(Array.isArray(r.data.data)).toBe(true)
  })
})

describe('商城模块 /shop', () => {
  test('GET /shop - 商品列表', async () => {
    const r = await axios.get(`${BASE}/shop`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(r.data.success).toBe(true)
    expect(Array.isArray(r.data.data)).toBe(true)
  })

  test('GET /shop/orders - 兑换记录', async () => {
    const r = await axios.get(`${BASE}/shop/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(r.data.success).toBe(true)
    expect(Array.isArray(r.data.data)).toBe(true)
  })
})

describe('邀请码模块 /invite-codes', () => {
  test('GET /invite-codes - 邀请码列表', async () => {
    const r = await axios.get(`${BASE}/invite-codes`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(r.data.success).toBe(true)
    expect(Array.isArray(r.data.data)).toBe(true)
  })

  test('管理员可以生成新邀请码', async () => {
    const r = await axios.post(`${BASE}/invite-codes`, {
      role: 'user',
      maxUses: 3,
    }, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(r.data.success).toBe(true)
  })

  test('GET /invite-codes/verify/:code - 验证邀请码', async () => {
    const r = await axios.get(`${BASE}/invite-codes/verify/ADMIN2026`)
    expect(r.data.success).toBe(true)
    expect(r.data.data).toHaveProperty('valid')
  })
})

describe('系统设置 /settings', () => {
  test('GET /settings - 获取系统设置', async () => {
    const r = await axios.get(`${BASE}/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(r.data.success).toBe(true)
    expect(r.data.data).toHaveProperty('guest_demo_user_id')
  })
})
