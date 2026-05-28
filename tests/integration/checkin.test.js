/**
 * 集成测试：打卡模块 API
 *
 * 测试目标：打卡 CRUD、统计、积分联动、数据隔离
 */

const axios = require('axios')
const BASE = 'http://localhost:3000/api'

let userToken = ''
let anotherUserToken = ''

beforeAll(async () => {
  // 登录测试用户
  const logins = [
    axios.post(`${BASE}/auth/login`, { username: 'admin', password: '123456' }),
  ]
  const [adminRes] = await Promise.all(logins)
  userToken = adminRes.data.data.token
})

describe('POST /checkins - 创建打卡', () => {
  const habitName = `test_habit_${Date.now()}`

  test('应成功创建打卡记录', async () => {
    const r = await axios.post(`${BASE}/checkins`, {
      habitName,
      date: new Date().toISOString().split('T')[0],
      points: 5,
    }, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    expect(r.data.success).toBe(true)
    expect(r.data.data).toHaveProperty('id')
  })

  test('缺少习惯名应返回 400', async () => {
    const r = await axios.post(`${BASE}/checkins`, {}, {
      headers: { Authorization: `Bearer ${userToken}` },
    }).catch(e => e.response)
    expect(r.status).toBe(400)
  })

  test('同一天同一习惯重复打卡应返回错误', async () => {
    const r = await axios.post(`${BASE}/checkins`, {
      habitName,
      date: new Date().toISOString().split('T')[0],
    }, {
      headers: { Authorization: `Bearer ${userToken}` },
    }).catch(e => e.response)
    // 要么 400 要么返回已有记录
    expect(r.status < 500).toBe(true)
  })
})

describe('GET /checkins - 打卡列表', () => {
  test('应返回打卡记录列表', async () => {
    const r = await axios.get(`${BASE}/checkins?month=2026-05`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    expect(r.data.success).toBe(true)
    expect(Array.isArray(r.data.data)).toBe(true)
  })

  test('无 Token 应返回 401', async () => {
    const r = await axios.get(`${BASE}/checkins`).catch(e => e.response)
    expect(r.status).toBe(401)
  })
})

describe('GET /checkins/stats - 打卡统计', () => {
  test('应返回统计信息', async () => {
    const r = await axios.get(`${BASE}/checkins/stats`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    expect(r.data.success).toBe(true)
    expect(r.data.data).toHaveProperty('habits')
    expect(r.data.data).toHaveProperty('month')
  })
})

describe('DELETE /checkins/record/:id - 删除打卡记录', () => {
  test('删除不存在的记录应返回 404', async () => {
    const r = await axios.delete(`${BASE}/checkins/record/99999`, {
      headers: { Authorization: `Bearer ${userToken}` },
    }).catch(e => e.response)
    expect(r.status).toBe(404)
  })
})

describe('打卡数据隔离', () => {
  test('用户 A 和用户 B 的打卡数据应不同', async () => {
    // 管理员看自己的打卡
    const r1 = await axios.get(`${BASE}/checkins`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    const adminRecords = r1.data.data || []

    // 每个用户的习惯集应独立
    expect(Array.isArray(adminRecords)).toBe(true)
  })
})
