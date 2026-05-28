const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const BASE = 'http://localhost';
  const PASS = Buffer.from('MTIzNDU2', 'base64').toString('utf8');

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 登录
  await page.locator('input[type="text"]').first().fill('admin');
  await page.locator('input[type="password"]').first().fill(PASS);
  await page.locator('button[type="submit"]').first().click();

  // 等待几秒
  await page.waitForTimeout(1000);

  // 检查 localStorage 状态
  const state = await page.evaluate(() => ({
    token: localStorage.getItem('token'),
    url: window.location.href,
    path: window.location.pathname,
  }));
  console.log('登录后1秒:', JSON.stringify(state, null, 2));

  // 再等
  await page.waitForTimeout(2000);
  const state2 = await page.evaluate(() => ({
    token: localStorage.getItem('token'),
    url: window.location.href,
    path: window.location.pathname,
  }));
  console.log('登录后3秒:', JSON.stringify(state2, null, 2));

  // 再等
  await page.waitForTimeout(3000);
  const state3 = await page.evaluate(() => ({
    token: localStorage.getItem('token'),
    url: window.location.href,
    path: window.location.pathname,
  }));
  console.log('登录后6秒:', JSON.stringify(state3, null, 2));

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
