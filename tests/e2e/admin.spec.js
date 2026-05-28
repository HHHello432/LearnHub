/**
 * E2E 测试：管理员功能测试
 *
 * 测试场景：用户管理 / 邀请码管理 / 系统设置
 */
const { test, expect } = require('@playwright/test')

test.describe('管理员功能', () => {
  async function loginAsAdmin(page) {
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

  test('用户管理 - 列表加载', async ({ page }) => {
    const token = await loginAsAdmin(page)
    await page.goto('/admin/users')
    await page.evaluate((t) => localStorage.setItem('learnhub_token', t), token)
    await page.goto('/admin/users')
    await page.waitForTimeout(2000)

    // 应该看到用户列表
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('用户')
    expect(bodyText).toContain('角色')
    expect(bodyText).toContain('状态')
  })

  test('邀请码管理 - 页面加载', async ({ page }) => {
    const token = await loginAsAdmin(page)
    await page.goto('/admin/invite-codes')
    await page.evaluate((t) => localStorage.setItem('learnhub_token', t), token)
    await page.goto('/admin/invite-codes')
    await page.waitForTimeout(2000)

    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('邀请码')
  })

  test('系统设置 - 页面加载', async ({ page }) => {
    const token = await loginAsAdmin(page)
    await page.goto('/admin/settings')
    await page.evaluate((t) => localStorage.setItem('learnhub_token', t), token)
    await page.goto('/admin/settings')
    await page.waitForTimeout(2000)

    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('游客演示账号')
    expect(bodyText).toContain('系统设置')
  })

  test('侧边栏管理菜单可见', async ({ page }) => {
    const token = await loginAsAdmin(page)
    await page.goto('/')
    await page.evaluate((t) => localStorage.setItem('learnhub_token', t), token)
    await page.goto('/')
    await page.waitForTimeout(2000)

    // 侧边栏应有管理入口
    const sidebarText = await page.locator('aside, nav, .sidebar').first().textContent()
    const hasAdminMenu = sidebarText.includes('商品管理') || sidebarText.includes('用户管理')
    expect(hasAdminMenu).toBeTruthy()
  })
})
