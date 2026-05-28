
const { chromium } = require('playwright');
const fs = require('fs');
const PASS = fs.readFileSync('/tmp/pwd.bin', 'utf8');

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await (await browser.newContext()).newPage();
  
  await p.goto('http://localhost/login', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
  
  await p.locator('input[type="text"]').first().fill('test');
  await p.locator('input[type="password"]').first().fill(PASS);
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(4000);
  
  const url = p.url();
  console.log('URL:', url);
  console.log('Result:', url.includes('/login') ? '❌ FAIL' : '✅ SUCCESS');
  
  (async () => {
    if (!url.includes('/login')) {
      await p.waitForTimeout(1000);
      const token = await p.evaluate(() => localStorage.getItem('learnhub_token'));
      console.log('Token:', token ? '✅' : '❌');
      
      console.log('
=== 刷新测试 ===');
      await p.goto('http://localhost/', { waitUntil: 'networkidle' });
      await p.waitForTimeout(3000);
      console.log('Refresh:', p.url().includes('/login') ? '❌ FAIL' : '✅ SUCCESS');
    }
    await browser.close();
  })();
}
main().catch(e => console.error(e));
