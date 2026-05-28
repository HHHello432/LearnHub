
const { chromium } = require("playwright");
const fs = require("fs");
const PASS = fs.readFileSync("/tmp/pwd.bin", "utf8").trim();

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();

  console.log("Password: [" + PASS + "] len=" + PASS.length);

  await p.goto("http://localhost/login", { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);

  await p.locator('input[type="text"]').first().fill("test");
  await p.locator('input[type="password"]').first().fill(PASS);
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(4000);

  const url = p.url();
  console.log("1. 登录后URL:", url);
  const ok = !url.includes("/login");
  console.log("2. 登录:", ok ? "✅ 成功" : "❌ 失败");

  if (ok) {
    const token = await p.evaluate(() => localStorage.getItem("learnhub_token"));
    console.log("3. Token:", token ? "✅" : "❌");

    await p.waitForTimeout(1000);
    const apis = [];
    p.on("response", r => {
      if (r.url().includes("/api/") && !r.url().includes("/login"))
        apis.push({ u: r.url().replace("http://localhost", ""), s: r.status() });
    });

    await p.waitForTimeout(2000);
    const all200 = apis.length > 0 && apis.every(a => a.s === 200);
    console.log("4. APIs:", apis.length + "个, 全部200:", all200 ? "✅" : "❌");

    console.log("\n=== 刷新测试 ===");
    await p.goto("http://localhost/", { waitUntil: "networkidle" });
    await p.waitForTimeout(3000);
    const refreshed = !p.url().includes("/login");
    console.log("5. 刷新:", refreshed ? "✅ 保持登录" : "❌ 掉登录");

    const t2 = await p.evaluate(() => localStorage.getItem("learnhub_token"));
    console.log("6. token持久化:", t2 ? "✅" : "❌");

    console.log("\n=== Cookie兜底 ===");
    await p.evaluate(() => localStorage.clear());
    await p.goto("http://localhost/", { waitUntil: "networkidle" });
    await p.waitForTimeout(2000);
    console.log("7. Cookie恢复:", !p.url().includes("/login") ? "✅ 成功" : "❌ 失败");
  }

  await ctx.close();
  await browser.close();
}
main().catch(e => console.error(e));
