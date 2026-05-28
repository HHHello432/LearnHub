const { chromium } = require('playwright');
const PASS = Buffer.from('MTIzNDU2', 'base64').toString('utf8');

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  
  let ok = 0, fail = 0;
  
  // ====== 测试1: 登录 ======
  console.log('测试1: 登录');
  await p.goto('http://localhost/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
  
  await p.locator('input[type="text"]').first().fill('admin');
  await p.locator('input[type="password"]').first().fill(PASS);
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(3000);
  
  const loginOk = !p.url().includes('/login');
  console.log(`  ${loginOk ? '✅' : '❌'} URL: ${p.url()}`);
  loginOk ? ok++ : fail++;
  
  // ====== 测试2: localStorage token ======
  const t1 = await p.evaluate(() => localStorage.getItem('learnhub_token'));
  console.log(`  ${t1 ? '✅' : '❌'} localStorage token: ${t1 ? '存在' : '无'}`);
  t1 ? ok++ : fail++;
  
  // ====== 测试3: Cookie ======
  const c1 = await p.evaluate(() => document.cookie.includes('learnhub_token'));
  console.log(`  ${c1 ? '✅' : '❌'} Cookie: ${c1 ? '存在' : '无'}`);
  c1 ? ok++ : fail++;
  
  // ====== 测试4: Dashboard API 请求 ======
  const apiCalls = [];
  p.on('response', r => {
    if (r.url().includes('/api/') && !r.url().includes('auth/login')) {
      apiCalls.push({ path: r.url().replace('http://localhost', ''), status: r.status() });
    }
  });
  await p.waitForTimeout(2000);
  const allOk = apiCalls.every(c => c.status === 200);
  console.log(`  ${allOk ? '✅' : '❌'} API 请求: ${apiCalls.length}个, 全部200: ${allOk}`);
  apiCalls.forEach(c => console.log(`    ${c.status} ${c.path}`));
  allOk ? ok++ : fail++;
  
  // ====== 测试5: 刷新页面 ======
  console.log('测试2: 刷新');
  await p.goto('http://localhost/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  const refreshOk = !p.url().includes('/login');
  console.log(`  ${refreshOk ? '✅' : '❌'} 刷新后: ${p.url()}`);
  refreshOk ? ok++ : fail++;
  
  // ====== 测试6: 关闭浏览器重新打开 ======
  console.log('测试3: Cookie 持久化');
  const cookies = await ctx.cookies();
  const lhCookie = cookies.find(c => c.name === 'learnhub_token');
  console.log(`  ${lhCookie ? '✅' : '❌'} Cookie 存在: ${lhCookie ? '有效' : '无'}`);
  
  // 清理 localStorage 只靠 cookie
  await p.evaluate(() => localStorage.clear());
  console.log('    已清空 localStorage');
  
  await p.goto('http://localhost/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  const cookieRecover = !p.url().includes('/login');
  console.log(`  ${cookieRecover ? '✅' : '❌'} Cookie 兜底恢复: ${p.url()}`);
  cookieRecover ? ok++ : fail++;
  
  // ====== 总结 ======
  console.log(`\n━━━━━━━━━━━━━━━━━━`);
  console.log(`通过: ${ok}/${ok+fail}`);
  console.log(`失败: ${fail}/${ok+fail}`);
  
  await ctx.close();
  await browser.close();
}

main().catch(err => { console.error('❌', err); process.exit(1); });
