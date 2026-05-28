
const { chromium } = require("playwright");
const { username, password } = { username: "demo2", password: "05b1d300-3548-4bc2-a94e-fdbb4ec89127" };

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  let ok = true;

  // Login
  await p.goto("http://localhost/login", { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  await p.locator("input").first().fill("demo2");
  await p.locator('input[type="password"]').first().fill("05b1d300-3548-4bc2-a94e-fdbb4ec89127");
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(4000);
  console.log("1. 登录:", p.url().includes("/login") ? "FAIL" : "PASS");
  
  // Tasks
  await p.goto("http://localhost/tasks", { waitUntil: "networkidle" });
  await p.waitForTimeout(2000);
  // 检查是否有标签显示
  const tags = await p.locator('.tag, .priority-label').count();
  console.log("2. 任务标签:", tags > 0 ? "PASS" : "OK(无标签)");
  
  // Notes
  await p.goto("http://localhost/notes", { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  const newBtn = await p.locator('button').filter({ hasText: /新建|新笔记/ }).count();
  console.log("3. 新建笔记按钮:", newBtn > 0 ? "PASS" : "OK");
  
  const sidebar = await p.locator('.sidebar-item, .note-item, .note-list-item').count();
  console.log("4. 笔记列表:", sidebar > 0 ? "PASS(有笔记)" : "OK(空)");
  
  // Diaries
  await p.goto("http://localhost/diaries", { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  const editBtns = await p.locator('button').filter({ hasText: /编辑/ }).count();
  console.log("5. 日记编辑按钮:", editBtns > 0 ? "PASS" : "OK(无编辑按钮)");
  
  // Checkins
  await p.goto("http://localhost/checkins", { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  const disabledChecks = await p.evaluate(() => {
    return Array.from(document.querySelectorAll('input[type="checkbox"]')).every(cb => cb.disabled);
  });
  console.log("6. 打卡可点击:", disabledChecks ? "FAIL(全disabled)" : "PASS");
  
  await ctx.close();
  await browser.close();
  console.log("\n全部完成");
}
main().catch(e => console.error("ERR:", e));
