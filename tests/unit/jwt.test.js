/**
 * 单元测试：JWT Token 工具函数
 *
 * 测试目标：generateToken / verifyToken
 * 覆盖点：Token 生成、正确解析、过期检测、无效 Token 处理
 */

const jwt = require('jsonwebtoken')

const JWT_SECRET = 'test-secret'

// 模拟 src/middleware/auth.js 中的逻辑
function generateToken(userId, role) {
  return jwt.sign({ userId, role: role || 'user' }, JWT_SECRET, { expiresIn: '7d' })
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

// 模拟过期 Token
function generateExpiredToken(userId, role) {
  return jwt.sign({ userId, role: role || 'user' }, JWT_SECRET, { expiresIn: '0s' })
}

describe('JWT Token 工具函数', () => {
  test('应生成有效的 JWT Token', () => {
    const token = generateToken(1, 'admin')
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    // JWT 由三部分组成
    expect(token.split('.')).toHaveLength(3)
  })

  test('应正确解码 Token 中的 userId 和 role', () => {
    const token = generateToken(42, 'user')
    const decoded = verifyToken(token)
    expect(decoded.userId).toBe(42)
    expect(decoded.role).toBe('user')
  })

  test('默认 role 应为 user', () => {
    const token = generateToken(1)
    const decoded = verifyToken(token)
    expect(decoded.role).toBe('user')
  })

  test('过期 Token 应抛出 TokenExpiredError', () => {
    const token = generateExpiredToken(1, 'admin')
    expect(() => verifyToken(token)).toThrow(jwt.TokenExpiredError)
  })

  test('无效 Token 应抛出 JsonWebTokenError', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow(jwt.JsonWebTokenError)
  })

  test('篡改 Token 应报错', () => {
    const token = generateToken(1, 'user')
    const tampered = token.slice(0, -5) + 'XXXXX'
    expect(() => verifyToken(tampered)).toThrow()
  })

  test('不同密钥签名的 Token 应报错', () => {
    const token = jwt.sign({ userId: 1 }, 'wrong-secret')
    expect(() => verifyToken(token)).toThrow()
  })
})

describe('bcrypt 密码加密', () => {
  const bcrypt = require('bcryptjs')

  test('密码加密后应和明文不同', async () => {
    const password = '123456'
    const hashed = await bcrypt.hash(password, 10)
    expect(hashed).not.toBe(password)
    expect(hashed.startsWith('$2a$')).toBe(true)
  })

  test('正确密码应通过验证', async () => {
    const hashed = await bcrypt.hash('myPassword123', 10)
    const isValid = await bcrypt.compare('myPassword123', hashed)
    expect(isValid).toBe(true)
  })

  test('错误密码应验证失败', async () => {
    const hashed = await bcrypt.hash('myPassword123', 10)
    const isValid = await bcrypt.compare('wrongPassword', hashed)
    expect(isValid).toBe(false)
  })
})
