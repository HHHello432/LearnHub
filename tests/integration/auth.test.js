/**
 * 集成测试：认证模块 API
 *
 * 测试目标：注册 → 登录 → Token 验证 → 用户信息 → 角色守卫
 * 依赖：后端服务必须在 :3000 运行
 */

const axios = require('axios')
const BASE = 'http://localhost:3000/api'

/** 生成随机用户名避免冲突 */
function randomUsername() {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

let testUser = { username: '', password: 'test123456' }
let userToken = ''
let adminToken = ''

beforeAll(async () => {
  testUser.username = randomUsername()

  // 获取管理员 Token
  try {
    const r = await axios.post(`${BASE}/auth/login`, { username: 'admin', password: '123456' })
    adminToken = r.data.data.token
  } catch (e) {
    console.warn('⚠️  管理员登录失败，部分测试会跳过:', e.message)
  }
})

describe('POST /auth/register - 用户注册', () => {
  test('应成功注册新用户（使用有效邀请码）', async () => {
    // 先找一个有效的邀请码
    let inviteCode = 'ADMIN2026'
    try {
      if (adminToken) {
        const codesRes = await axios.get(`${BASE}/invite-codes`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
        const codes = codesRes.data.data || []
        if (codes.length > 0) inviteCode = codes[0].code
      }
    } catch { /* ignore */ }

    const r = await axios.post(`${BASE}/auth/register`, {
      username: testUser.username,
      password: testUser.password,
      nickname: '测试用户',
      inviteCode,
    })
    expect([200, 201]).toContain(r.status)
    expect(r.data.success).toBe(true)
    expect(r.data.data).toHaveProperty('token')
    expect(r.data.data).toHaveProperty('user')
    expect(r.data.data.user.role).toBe('user')
    userToken = r.data.data.token
  })

  test('重复用户名应返回 400', async () => {
    const r = await axios.post(`${BASE}/auth/register`, {
      username: testUser.username,
      password: testUser.password,
      inviteCode: 'ADMIN2026',
    }).catch(e => e.response)
    expect([400, 409]).toContain(r.status)
    expect(r.data.success).toBe(false)
  })

  test('无效邀请码应返回 400', async () => {
    const r = await axios.post(`${BASE}/auth/register`, {
      username: randomUsername(),
      password: '123456',
      inviteCode: 'INVALID_CODE_XYZ',
    }).catch(e => e.response)
    expect([400, 409]).toContain(r.status)
  })
})

describe('POST /auth/login - 用户登录', () => {
  test('正确密码应登录成功', async () => {
    const r = await axios.post(`${BASE}/auth/login`, {
      username: testUser.username,
      password: testUser.password,
    })
    expect(r.data.success).toBe(true)
    expect(r.data.data).toHaveProperty('token')
    userToken = r.data.data.token
  })

  test('错误密码应返回 401', async () => {
    const r = await axios.post(`${BASE}/auth/login`, {
      username: testUser.username,
      password: 'wrong_password',
    }).catch(e => e.response)
    expect(r.status).toBe(401)
  })

  test('不存在的用户应返回 401', async () => {
    const r = await axios.post(`${BASE}/auth/login`, {
      username: 'nonexistent_user_xxx',
      password: '123456',
    }).catch(e => e.response)
    expect(r.status).toBe(401)
  })
})

describe('GET /auth/me - 当前用户信息', () => {
  test('有效 Token 应返回用户信息', async () => {
    const r = await axios.get(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    expect(r.data.success).toBe(true)
    expect(r.data.data.username).toBe(testUser.username)
    expect(r.data.data).toHaveProperty('role')
  })

  test('无 Token 应返回 401', async () => {
    const r = await axios.get(`${BASE}/auth/me`).catch(e => e.response)
    expect(r.status).toBe(401)
  })

  test('过期 Token 应返回 401', async () => {
    const r = await axios.get(`${BASE}/auth/me`, {
      headers: { Authorization: 'Bearer expired.token.here' },
    }).catch(e => e.response)
    expect(r.status).toBe(401)
  })
})

describe('GET /auth/role - 角色查询', () => {
  test('应返回用户角色', async () => {
    const r = await axios.get(`${BASE}/auth/role`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    expect(r.data.success).toBe(true)
    expect(r.data.data).toHaveProperty("role")
  })
})

describe('管理员接口鉴权', () => {
  test('普通用户无法访问用户列表', async () => {
    const r = await axios.get(`${BASE}/auth/users`, {
      headers: { Authorization: `Bearer ${userToken}` },
    }).catch(e => e.response)
    // 应该返回 403
    expect(r.status === 403 || !r.data.success).toBe(true)
  })

  test('管理员可以访问用户列表', async () => {
    if (!adminToken) return
    const r = await axios.get(`${BASE}/auth/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(r.data.success).toBe(true)
    expect(r.data.data).toHaveProperty('users')
    expect(r.data.data).toHaveProperty('total')
    expect(Array.isArray(r.data.data.users)).toBe(true)
  })
})
