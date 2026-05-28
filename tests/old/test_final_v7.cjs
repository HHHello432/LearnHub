
const { chromium } = require("playwright");
const PASS = "f3d76e97-9d7d-4689-8747-ec9cba1476a7";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();

  console.log("Using password:", PASS);

  await p.goto("http://localhost/login", { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);

  await p.locator('input[type="text"]').first().fill("user2");
  await p.locator('input[type="password"]').first().fill(PASS);
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(3000);

  const url = p.url();
  console.log("\n结果:");
  console.log("  URL:", url);
  console.log("  登录:", !url.includes("/login") ? "SUCCESS" : "FAILED");

  if (!url.includes("/login")) {
    const token = await p.evaluate(() => localStorage.getItem("learnhub_token"));
    console.log("  Token:", token ? "OK" : "NONE");
    await p.goto("http://localhost/", { waitUntil: "networkidle" });
    await p.waitForTimeout(2000);
    console.log("  刷新:", !p.url().includes("/login") ? "OK" : "FAILED");
  }

  await ctx.close();
  await browser.close();
}
main().catch(e => console.error("Error:", e));
