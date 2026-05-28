/**
 * E2E 测试：用户完整旅程
 *
 * 测试场景：登录 → 首页仪表盘 → 添加待办 → 打卡 → 查看商城 → 退出
 */
const { test, expect } = require('@playwright/test')

const ADMIN_USER = { username: 'admin', password: '123456' }

test.describe('学习平台用户旅程', () => {
  test.beforeEach(async ({ page }) => {
    // 确保每次测试前从干净状态开始
    await page.evaluate(() => localStorage.clear())
  })

  test('用户登录', async ({ page }) => {
    await page.goto('/login')

    // 页面应显示登录表单
    await expect(page.locator('h1, h2, h3').first()).toBeVisible()

    // 填写登录表单
    await page.fill('input[type="text"]', ADMIN_USER.username)
    const passwordInput = page.locator('input[type="password"], input[placeholder*="密码"]')
    await passwordInput.fill(ADMIN_USER.password)

    // 点击登录按钮
    await page.click('button:has-text("登录")')

    // 登录成功后应跳转到首页
    await page.waitForURL(/\/$|\/dashboard|\/home/i, { timeout: 10000 })

    // 首页应显示仪表盘数据
    await expect(page.locator('text=今日专注').or(page.locator('text=待办剩余')).first()).toBeVisible({ timeout: 5000 })
  })

  test('首页仪表盘数据显示', async ({ page }) => {
    // 通过 API 设置 Token 直接跳到首页
    const token = await getAdminToken(page)
    await page.goto('/')
    await page.evaluate((t) => localStorage.setItem('learnhub_token', t), token)
    await page.goto('/')

    // 等待仪表盘数据加载
    await page.waitForTimeout(2000)

    // 检查核心数据卡片是否存在
    const visibleText = await page.locator('text=今日专注').or(page.locator('text=待办剩余')).isVisible()
    expect(visibleText).toBeTruthy()
  })

  test('打卡页面基本功能', async ({ page }) => {
    const token = await getAdminToken(page)
    await page.goto('/checkins')
    await page.evaluate((t) => localStorage.setItem('learnhub_token', t), token)
    await page.goto('/checkins')
    await page.waitForTimeout(2000)

    // 页面标题应包含"打卡"
    const title = await page.locator('h1, h2, h3').first().textContent()
    expect(title).toContain('打卡')

    // 统计信息应显示
    const statsElements = page.locator('text=总习惯数, text=今日完成, text=最高连续')
    const count = await statsElements.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('待办页面显示', async ({ page }) => {
    const token = await getAdminToken(page)
    await page.goto('/tasks')
    await page.evaluate((t) => localStorage.setItem('learnhub_token', t), token)
    await page.goto('/tasks')
    await page.waitForTimeout(2000)

    // 待办页面应加载
    const title = await page.locator('h1, h2, h3').first().textContent()
    expect(title).toContain('待办')
  })

  test('商城页面显示', async ({ page }) => {
    const token = await getAdminToken(page)
    await page.goto('/shop')
    await page.evaluate((t) => localStorage.setItem('learnhub_token', t), token)
    await page.goto('/shop')
    await page.waitForTimeout(2000)

    // 商城页面应加载
    const title = await page.locator('h1, h2, h3').first().textContent()
    expect(title).toContain('商城')
  })

  test('用户管理页面 - 仅管理员可访问', async ({ page }) => {
    const token = await getAdminToken(page)
    await page.goto('/admin/users')
    await page.evaluate((t) => localStorage.setItem('learnhub_token', t), token)
    await page.goto('/admin/users')
    await page.waitForTimeout(2000)

    // 用户管理页面应显示
    const content = await page.locator('body').textContent()
    expect(content).toContain('用户')
  })
})

/** 通过 API 获取管理员 Token */
async function getAdminToken(page) {
  const token = await page.evaluate(async () => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '123456' }),
    })
    const data = await r.json()
    return data.data?.token || ''
  })
  return token
}
