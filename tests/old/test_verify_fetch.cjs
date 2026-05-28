
const { chromium } = require("playwright");
const PASS = "306214bf-78b1-493d-9abe-bc649021e3a1";
const USER = "user3";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();

  await p.goto("http://localhost/login", { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);

  // 用 fetch 绕过Vue，直接验证API返回
  const result = await p.evaluate(async (user, pass) => {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    });
    const data = await r.json();
    console.log("API raw response:", JSON.stringify(data).substring(0, 200));
    
    // 模拟 axios 结构
    console.log("data.data:", JSON.stringify(data.data).substring(0, 100));
    console.log("data.data.token:", data.data?.token);
    
    // 正确保存
    if (data.data?.token) {
      localStorage.setItem("learnhub_token", data.data.token);
      return { ok: true, token: data.data.token.substring(0, 20) };
    }
    return { ok: false };
  }, USER, PASS);

  console.log("\nFetch结果:", JSON.stringify(result));

  const token = await p.evaluate(() => localStorage.getItem("learnhub_token"));
  console.log("localStorage:", token ? token.substring(0,20)+"..." : "NONE");

  // 现在刷新
  if (result.ok) {
    await p.goto("http://localhost/", { waitUntil: "networkidle" });
    await p.waitForTimeout(2000);
    console.log("刷新后URL:", p.url());
  }

  await ctx.close();
  await browser.close();
}
main().catch(e => console.error("ERR:", e));
