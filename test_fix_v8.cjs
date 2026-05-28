
const { chromium } = require("playwright");
const PASS = "306214bf-78b1-493d-9abe-bc649021e3a1";
const USER = "user3";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();

  const apis = [];
  p.on("response", r => {
    if (r.url().includes("/api/"))
      apis.push({ u: r.url().replace("http://localhost", ""), s: r.status() });
  });

  await p.goto("http://localhost/login", { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);

  await p.locator("input").first().fill(USER);
  await p.locator('input[type="password"]').first().fill(PASS);
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(4000);

  const url = p.url();
  console.log("URL:", url);
  console.log("登录:", !url.includes("/login") ? "PASS" : "FAIL");

  // 输出 API 请求
  console.log("\nAPI请求:");
  apis.filter(a => !a.u.includes("/auth/me")).forEach(a => console.log(`  ${a.s} ${a.u}`));

  const ls = await p.evaluate(() => localStorage.getItem("learnhub_token"));
  console.log("\nlocalStorage token:", ls ? "PASS " + ls.substring(0,20) : "FAIL");

  if (!url.includes("/login")) {
    console.log("\n=== 刷新 ===");
    await p.goto("http://localhost/", { waitUntil: "networkidle" });
    await p.waitForTimeout(2000);
    console.log("刷新:", !p.url().includes("/login") ? "PASS" : "FAIL");
  }

  await ctx.close();
  await browser.close();
}
main().catch(e => console.error("ERR:", e));
