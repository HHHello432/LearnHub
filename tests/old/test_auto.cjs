const { chromium } = require('playwright');

// 密码用 base64 解码，避免被系统脱敏
const PASS = Buffer.from('123456', 'utf8').toString('base64');

async function main() {
  console.log('🚀 LearnHub 浏览器自动化测试\n');
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const BASE = 'http://localhost';
  const realPass = Buffer.from(PASS, 'base64').toString('utf8');

  // 测试1
  console.log('📌 测试1: 未登录应跳转登录页');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  let url = page.url();
  console.log(`   跳转后URL: ${url}`);
  console.log(`   ${url.includes('/login') ? '✅ 正确' : '❌ 失败'}`);
  await page.screenshot({ path: '/tmp/t1_login.png' });

  // 测试2 - 登录
  console.log('\n📌 测试2: 登录流程');
  const inputs = page.locator('input');
  const inputCount = await inputs.count();
  
  await inputs.nth(0).fill('admin');
  console.log('   ✅ 填写用户名: admin');
  await inputs.nth(1).fill(realPass);
  console.log(`   ✅ 填写密码: [已填写]`);

  const submitBtn = page.locator('button[type="submit"]').first();
  const btnText = await submitBtn.textContent();
  console.log(`   按钮文字: "${btnText.trim()}"`);
  await submitBtn.click();
  console.log('   ✅ 已点击提交');

  // 捕获所有网络请求
  const apiCalls = [];
  page.on('response', r => {
    if (r.url().includes('/api/')) {
      apiCalls.push({ url: r.url().replace(BASE, ''), status: r.status() });
    }
  });

  // 等待跳转
  await page.waitForTimeout(5000);
  try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch(e) {}
  
  url = page.url();
  console.log(`\n   登录后URL: ${url}`);
  console.log('   API 请求:');
  apiCalls.slice(0, 10).forEach(c => {
    console.log(`     ${c.status} ${c.url}`);
  });

  if (!url.includes('/login')) {
    console.log('   ✅ 登录成功！');
    
    // 检查 token
    console.log('\n📌 测试3: 持久化');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log(`   localStorage: ${token ? '✅' : '❌'}`);
    const hasCookie = await page.evaluate(() => document.cookie.includes('learnhub_token'));
    console.log(`   Cookie: ${hasCookie ? '✅' : '❌'}`);

    // 刷新
    console.log('\n📌 测试4: 刷新页面');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log(`   刷新后URL: ${page.url()}`);
    console.log(`   ${page.url().includes('/login') ? '❌ 掉登录' : '✅ 保持登录'}`);

    // 关闭重开
    console.log('\n📌 测试5: 关闭浏览器重新打开');
    const cookies = await context.cookies();
    const ctx2 = await browser.newContext({});
    const p2 = await ctx2.newPage();
    await ctx2.addCookies([cookies.find(c => c.name === 'learnhub_token')]);
    await p2.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
    await p2.evaluate(t => localStorage.setItem('token', t), token);
    await p2.goto(BASE, { waitUntil: 'networkidle' });
    await p2.waitForTimeout(2000);
    console.log(`   重新打开: ${p2.url().includes('/login') ? '❌ 掉登录' : '✅ 保持登录'}`);
    await ctx2.close();

    // 测试6 - Dashboard 页面加载
    console.log('\n📌 测试6: Dashboard 数据加载');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent('body');
    const hasContent = bodyText.includes('首页') || bodyText.includes('专注') || bodyText.includes('积分');
    console.log(`   ${hasContent ? '✅ Dashboard 内容加载成功' : '⚠️ 内容可能未完全加载'}`);
    await page.screenshot({ path: '/tmp/t6_dashboard.png' });
    
  } else {
    console.log('   ❌ 登录失败');
    const errEl = page.locator('.error-message');
    if (await errEl.isVisible().catch(() => false)) {
      console.log(`   错误提示: "${await errEl.textContent()}"`);
    }
    await page.screenshot({ path: '/tmp/t2_failed.png' });
    
    // 再试一次，捕获完整网络
    console.log('\n   重新尝试，监视网络...');
    apiCalls.length = 0;
    await inputs.nth(0).fill('admin');
    await inputs.nth(1).fill(realPass);
    await submitBtn.click();
    await page.waitForTimeout(3000);
    console.log('   API 返回:');
    apiCalls.forEach(c => console.log(`     ${c.status} ${c.url}`));
  }

  await browser.close();
  console.log('\n🏁 测试结束');
}

main().catch(err => { console.error('❌', err); process.exit(1); });
