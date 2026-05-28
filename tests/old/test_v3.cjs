const { chromium } = require("playwright");
const PASS = "123456";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const p = await (await browser.newContext()).newPage();
  
  await p.goto("http://localhost/login", { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  
  await p.locator("input[type=\"text\"]").first().fill("admin");
  await p.locator("input[type=\"password\"]").first().fill(PASS);
  await p.locator("button[type=\"submit\"]").first().click();
  await p.waitForTimeout(3000);
  
  const url = p.url();
  console.log("登录后URL:", url);
  const token = await p.evaluate(() => localStorage.getItem("learnhub_token"));
  console.log("token:", token ? token.substring(0,25)+"..." : "NONE");
  
  if (!url.includes("/login")) {
    console.log("\n=== 刷新测试 ===");
    await p.goto("http://localhost/", { waitUntil: "networkidle" });
    await p.waitForTimeout(2000);
    console.log("刷新后:", p.url());
    
    const t2 = await p.evaluate(() => ({
      token: localStorage.getItem("learnhub_token"),
      cookie: document.cookie
    }));
    console.log("状态:", JSON.stringify(t2));
  }
  
  await browser.close();
  console.log("\n完成");
}
main().catch(e => console.error(e));
