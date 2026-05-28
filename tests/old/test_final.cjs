const { chromium } = require('playwright');
const path = require('path');

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const BASE = 'http://localhost';
  const PASS = Buffer.from('MTIzNDU2', 'base64').toString('utf8');

  // 测试1: 登录
  console.log('📌 登录测试');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  await page.locator('input[type="text"]').first().fill('admin');
  await page.locator('input[type="password"]').first().fill(PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(5000);
  
  const url = page.url();
  console.log(`   登录后URL: ${url}`);
  const token = await page.evaluate(() => localStorage.getItem('learnhub_token'));
  console.log(`   localStorage: ${token ? '✅ 存在' : '❌ 无'}`);
  
  if (!url.includes('/login')) {
    console.log('   ✅ 登录成功！');
  } else {
    console.log('   ❌ 登录失败');
    const errText = await page.locator('.error-message').textContent().catch(() => '无');
    console.log(`   错误: "${errText}"`);
    await page.screenshot({ path: '/tmp/test_fail.png' });
    await browser.close();
    return;
  }

  // 测试2: 刷新
  console.log('\n📌 刷新测试');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log(`   刷新后: ${page.url().includes('/login') ? '❌ 掉登录' : '✅ 保持登录'}`);
  const token2 = await page.evaluate(() => localStorage.getItem('learnhub_token'));
  console.log(`   token: ${token2 ? '✅ 存在' : '❌ 无'}`);

  // 测试3: Dashboard 内容
  console.log('\n📌 Dashboard 加载测试');
  const body = await page.textContent('body');
  const hasStats = body.includes('专注') || body.includes('积分') || body.includes('待办');
  console.log(`   ${hasStats ? '✅ Dashboard 内容已加载' : '⚠️ 可能未完全加载'}`);
  await page.screenshot({ path: '/tmp/test_dashboard.png' });
  console.log('   截图已保存');

  // 测试4: 清除 localStorage 但保留 cookie
  console.log('\n📌 Cookie 兜底测试');
  await page.evaluate(() => localStorage.removeItem('learnhub_token'));
  console.log('   已清除 localStorage');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log(`   cookie 恢复: ${page.url().includes('/login') ? '❌ 失败' : '✅ 成功'}`);

  await browser.close();
  console.log('\n🏁 全部测试完成');
}

main().catch(err => { console.error('❌', err); process.exit(1); });
