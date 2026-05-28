const { chromium } = require('playwright');
const PASS = Buffer.from('***', 'base64').toString('utf8');

async function main() {
  console.log('密码:', PASS);
  console.log('密码长度:', PASS.length);
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await (await browser.newContext()).newPage();
  
  await p.goto('http://localhost/login', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
  
  // 直接 fetch 测试
  const result = await p.evaluate(async (pass) => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: pass })
    });
    const data = await r.json();
    if (data.success && data.data?.token) {
      localStorage.setItem('learnhub_token', data.data.token);
      return { ok: true, token: data.data.token.substring(0, 20) };
    }
    return { ok: false, data };
  }, PASS);
  
  console.log('fetch结果:', JSON.stringify(result));
  
  if (result.ok) {
    const token = await p.evaluate(() => localStorage.getItem('learnhub_token'));
    console.log('localStorage:', token ? token.substring(0,25)+'...' : 'NONE');
    
    await p.goto('http://localhost/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(2000);
    console.log('刷新后URL:', p.url());
  }
  
  await browser.close();
}
main().catch(e => console.error(e));
