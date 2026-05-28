const { chromium } = require('playwright');

// 从 hex 解码密码
const PASS = Buffer.from('313233343536', 'hex').toString('utf8');

async function main() {
  console.log('密码验证:', PASS === '123456' ? '✅' : '❌');
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await (await browser.newContext()).newPage();
  
  // 登录
  await p.goto('http://localhost/login', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
  
  await p.locator('input[type="text"]').first().fill('admin');
  await p.locator('input[type="password"]').first().fill(PASS);
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(4000);
  
  const url = p.url();
  console.log('1. 登录后URL:', url);
  const token = await p.evaluate(() => localStorage.getItem('learnhub_token'));
  console.log('2. token:', token ? token.substring(0,20)+'... ✅' : 'NONE ❌');
  console.log('3. 登录:', url.includes('/login') ? '❌ 失败' : '✅ 成功');
  
  if (!url.includes('/login')) {
    // 刷新
    console.log('\n=== 刷新测试 ===');
    await p.goto('http://localhost/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(3000);
    console.log('刷新后:', p.url().includes('/login') ? '❌ 掉登录' : '✅ 保持登录');
    
    const t2 = await p.evaluate(() => ({
      token: localStorage.getItem('learnhub_token'),
      hasCookie: document.cookie.includes('learnhub_token')
    }));
    console.log('token:', t2.token ? '✅' : '❌', '| cookie:', t2.hasCookie ? '✅' : '❌');
  }
  
  await browser.close();
}
main().catch(e => console.error('ERROR:', e));
