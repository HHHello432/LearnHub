const { chromium } = require('playwright');
const PASS = Buffer.from('MTIzNDU2', 'base64').toString('utf8');

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  
  // 登录
  await p.goto('http://localhost/login', { waitUntil: 'networkidle' });
  await p.waitForTimeout(500);
  
  await p.locator('input[type="text"]').first().fill('admin');
  await p.locator('input[type="password"]').first().fill(PASS);
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(3000);
  
  // 查看当前 cookie
  const cookies = await ctx.cookies();
  console.log('所有 cookies:');
  cookies.forEach(c => console.log(`  ${c.name} = ${c.value.substring(0,20)}... domain=${c.domain} path=${c.path} sameSite=${c.sameSite}`));
  
  // localStorage
  const ls = await p.evaluate(() => ({
    learnhub_token: localStorage.getItem('learnhub_token'),
    token: localStorage.getItem('token')
  }));
  console.log('\nlocalStorage:', JSON.stringify(ls, null, 2));
  
  // 手动写入 cookie（模拟Vue的setCookie）
  await p.evaluate(() => {
    const t = localStorage.getItem('learnhub_token');
    document.cookie = `learnhub_token=${encodeURIComponent(t)}; path=/; max-age=2592000; SameSite=Lax`;
    console.log('手动写入cookie:', document.cookie);
  });
  
  const cookies2 = await ctx.cookies();
  console.log('\n手动写入后 cookies:');
  cookies2.forEach(c => console.log(`  ${c.name} = ${c.value.substring(0,20)}...`));
  
  // 清除 localStorage 测试 cookie
  await p.evaluate(() => localStorage.clear());
  await p.goto('http://localhost/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  console.log('\n清除localStorage后:', p.url());
  
  await ctx.close();
  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
