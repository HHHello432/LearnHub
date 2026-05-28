
const { chromium } = require("playwright");
const PASS = "f3d76e97-9d7d-4689-8747-ec9cba1476a7";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();

  await p.goto("http://localhost/login", { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);

  await p.locator('input[type="text"]').first().fill("user2");
  await p.locator('input[type="password"]').first().fill(PASS);
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(4000);

  const url = p.url();
  console.log("1. 登录后URL:", url);
  const loginOk = !url.includes("/login");
  console.log("2. 登录:", loginOk ? "✅ 成功" : "❌ 失败");

  if (loginOk) {
    const token = await p.evaluate(() => localStorage.getItem("learnhub_token"));
    console.log("3. Token:", token ? "✅ 存在" : "❌ 无");

    const apis = [];
    p.on("response", r => {
      if (r.url().includes("/api/") && !r.url().includes("/login"))
        apis.push({ u: r.url().replace("http://localhost", ""), s: r.status() });
    });
    await p.waitForTimeout(2000);

    const allOk = apis.length > 0 && apis.every(a => a.s === 200);
    console.log("4. APIs 全部200:", allOk ? "✅" : "❌");
    apis.forEach(a => console.log("   " + a.s + " " + a.u));

    console.log("\n=== 刷新测试 ===");
    await p.goto("http://localhost/", { waitUntil: "networkidle" });
    await p.waitForTimeout(3000);
    console.log("5. 刷新:", !p.url().includes("/login") ? "✅ 保持登录" : "❌ 掉登录");

    const t2 = await p.evaluate(() => localStorage.getItem("learnhub_token"));
    console.log("6. Token 持久化:", t2 ? "✅" : "❌");
  }

  await ctx.close();
  await browser.close();
}
main().catch(e => console.error(e));
