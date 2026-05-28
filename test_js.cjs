const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const BASE = 'http://localhost';
  const PASS = Buffer.from('MTIzNDU2', 'base64').toString('utf8');

  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 直接在浏览器里执行 fetch 测试
  const result = await page.evaluate(async (pwd) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: pwd })
      });
      const data = await res.json();
      console.log('fetch 返回:', JSON.stringify(data).substring(0, 200));
      
      // 检查数据结构
      if (data.success && data.data && data.data.token) {
        localStorage.setItem('token', data.data.token);
        return { success: true, tokenPrefix: data.data.token.substring(0, 20) };
      } else {
        return { success: false, data: data };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, PASS);

  console.log('浏览器 fetch 结果:', JSON.stringify(result, null, 2));

  if (result.success) {
    // 刷新看看
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log('localStorage token:', token ? token.substring(0, 25) + '...' : 'null');
    
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('刷新后URL:', page.url());
  }

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
