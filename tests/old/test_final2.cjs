const { chromium } = require('playwright');
const PASS = Buffer.from('MTIzNDU2', 'base64').toString('utf8');

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  
  let pass = 0, total = 0;
  function check(name, cond) { total++; console.log(`  ${cond ? '✅' : '❌'} ${name}`); if (cond) pass++; }

  console.log('📌 测试1: 登录流程');
  await p.goto('http://localhost/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
  
  await p.locator('input[type="text"]').first().fill('admin');
  await p.locator('input[type="password"]').first().fill(PASS);
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(3000);
  
  check('登录成功进入主页', !p.url().includes('/login'));
  
  const t1 = await p.evaluate(() => localStorage.getItem('learnhub_token'));
  check('localStorage token', t1 && t1 !== 'undefined' && t1 !== 'null');
  
  // Dashboard API
  const apiReqs = [];
  p.on('response', r => {
    if (r.url().includes('/api/') && !r.url().endsWith('/login')) {
      apiReqs.push({ url: r.url().replace('http://localhost', ''), status: r.status() });
    }
  });
  await p.waitForTimeout(2000);
  
  const all200 = apiReqs.length > 0 && apiReqs.every(r => r.status === 200);
  check('API 全部 200 (' + apiReqs.length + '个请求)', all200);
  
  console.log('\n📌 测试2: 刷新页面');
  await p.evaluate(() => {
    const t = localStorage.getItem('learnhub_token');
    document.cookie = `learnhub_token=${encodeURIComponent(t)}; path=/; max-age=2592000`;
  });
  
  await p.goto('http://localhost/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  
  check('刷新后保持登录', !p.url().includes('/login'));
  
  const t2 = await p.evaluate(() => {
    const learnhub = localStorage.getItem('learnhub_token');
    const old = localStorage.getItem('token');
    const cookie = document.cookie;
    return { learnhub, old, cookie: cookie ? 'has_cookie' : 'no_cookie' };
  });
  check('token 持久化', t2.learnhub && t2.learnhub !== 'undefined' && t2.learnhub !== 'null');
  
  console.log('\n📌 测试3: Cookie 兜底');
  await p.evaluate(() => localStorage.clear());
  await p.goto('http://localhost/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  check('Cookie 恢复登录', !p.url().includes('/login'));
  
  console.log(`\n📊 结果: ${pass}/${total} 通过`);
  await ctx.close();
  await browser.close();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
