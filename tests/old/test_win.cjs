
const { chromium } = require("playwright");
const PASS = "306214bf-78b1-493d-9abe-bc649021e3a1";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();

  await p.goto("http://localhost/login", { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);

  await p.locator('input[type="text"]').first().fill("user3");
  await p.locator('input[type="password"]').first().fill(PASS);
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(3000);

  const url = p.url();
  console.log("\n=== 测试结果 ===");
  const ok = !url.includes("/login");
  console.log("登录:", ok ? "PASS" : "FAIL");

  if (ok) {
    const t = await p.evaluate(() => localStorage.getItem("learnhub_token"));
    console.log("Token:", t ? "PASS" : "FAIL");

    await p.goto("http://localhost/", { waitUntil: "networkidle" });
    await p.waitForTimeout(2000);
    console.log("刷新:", !p.url().includes("/login") ? "PASS" : "FAIL");
  }

  await ctx.close();
  await browser.close();
}
main().catch(e => console.error("ERR:", e));
