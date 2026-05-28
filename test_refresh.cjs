const { chromium } = require('playwright');
const PASS = Buffer.from('MTIzNDU2', 'base64').toString('utf8');

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  
  // 第一步：登录并保存认证信息
  const ctx1 = await browser.newContext();
  const p1 = await ctx1.newPage();
  await p1.goto('http://localhost/login', { waitUntil: 'networkidle' });
  await p1.waitForTimeout(500);
  
  // 手动 fetch 登录
  await p1.evaluate(async (pass) => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: pass })
    });
    const d = await r.json();
    if (d.success && d.data?.token) {
      localStorage.setItem('learnhub_token', d.data.token);
      // 再存一份旧 key 保险
      localStorage.setItem('token', d.data.token);
    }
  }, PASS);
  
  const token = await p1.evaluate(() => localStorage.getItem('learnhub_token'));
  console.log('token saved:', token ? '✅' : '❌');
  
  // 刷新页面
  console.log('\n刷新页面...');
  await p1.goto('http://localhost/', { waitUntil: 'networkidle' });
  await p1.waitForTimeout(2000);
  console.log('刷新后URL:', p1.url());
  
  const afterToken = await p1.evaluate(() => ({
    learnhub: localStorage.getItem('learnhub_token')?.substring(0, 20) || null,
    cookie: document.cookie,
    url: window.location.href
  }));
  console.log('刷新后状态:', JSON.stringify(afterToken, null, 2));
  
  // 看看控制台错误
  const errors = [];
  p1.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning')
      errors.push({ type: msg.type(), text: msg.text() });
  });
  
  // 看看网络请求
  const apiReqs = [];
  p1.on('response', r => {
    if (r.url().includes('/api/')) apiReqs.push({ url: r.url().replace('http://localhost', ''), status: r.status() });
  });
  
  // 重新加载，捕获网络
  await p1.goto('http://localhost/', { waitUntil: 'domcontentloaded' });
  await p1.waitForTimeout(3000);
  
  console.log('\n网络请求:');
  apiReqs.forEach(r => console.log(`  ${r.status} ${r.url}`));
  
  if (errors.length > 0) {
    console.log('\n控制台错误:');
    errors.forEach(e => console.log(`  ${e.type}: ${e.text}`));
  }

  await ctx1.close();
  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
