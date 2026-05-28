
const { chromium } = require("playwright");
const PASS = "43bb66f9-773b-4696-a433-dda692fd6b22";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const BASE = "http://localhost";
  let pass = 0, total = 0;
  const ok = (name, cond) => { total++; console.log(`  ${cond?"✅":"❌"} ${name}`); if(cond) pass++; };

  // ── Login ──
  console.log("\n📌 1. 登录");
  await p.goto(BASE + "/login", { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  await p.locator("input").first().fill("demo");
  await p.locator('input[type="password"]').first().fill(PASS);
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(3000);
  ok("登录成功", !p.url().includes("/login"));
  const t = await p.evaluate(() => localStorage.getItem("learnhub_token"));
  ok("localStorage有token", !!t);
  
  // ── Tasks: 四象限分类 ──
  console.log("\n📌 2. 待办四象限");
  await p.goto(BASE + "/tasks", { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  // 创建任务
  await p.locator('input[placeholder*="待办"]').first().fill("重要紧急任务");
  // 选重要紧急
  const quadrantBtns = await p.locator('.quadrant-btn').all();
  if (quadrantBtns.length > 1) await quadrantBtns[1].click();
  await p.waitForTimeout(300);
  await p.locator('button').filter({ hasText: /添加|新增/ }).first().click();
  await p.waitForTimeout(1500);
  const tasks = await p.locator('.task-item').all();
  ok("可以添加任务", tasks.length > 0);
  // 检查是否显示了分类标签
  const tags = await p.locator('.tag').allTextContents();
  ok("任务显示分类标签", tags.length > 0);
  
  // ── Notes: 笔记创建 ──
  console.log("\n📌 3. 笔记创建");
  await p.goto(BASE + "/notes", { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  await p.locator('button').filter({ hasText: /新建/ }).first().click();
  await p.waitForTimeout(500);
  // 填写标题
  const titleInputs = await p.locator('input').all();
  if (titleInputs.length > 0) await titleInputs[0].fill("测试笔记");
  await p.locator('button').filter({ hasText: /保存/ }).first().click();
  await p.waitForTimeout(1500);
  const notes = await p.locator('.note-item,.note-list-item,.sidebar-item').all();
  ok("可以创建笔记", notes.length > 0);
  
  // ── Diaries: 日记编辑 ──
  console.log("\n📌 4. 日记功能");
  await p.goto(BASE + "/diaries", { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  await p.locator('button').filter({ hasText: /写日记|新建/ }).first().click();
  await p.waitForTimeout(500);
  const diaryInputs = await p.locator('input').all();
  if (diaryInputs.length > 0) await diaryInputs[0].fill("测试日记");
  await p.locator('button').filter({ hasText: /保存|发布/ }).first().click();
  await p.waitForTimeout(1500);
  const hasEditBtn = await p.locator('button').filter({ hasText: /编辑/ }).count();
  ok("日记可编辑", hasEditBtn > 0);
  
  // ── Checkins: 打卡 ──
  console.log("\n📌 5. 打卡功能");
  await p.goto(BASE + "/checkins", { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  const checkboxes = await p.locator('input[type="checkbox"]').all();
  const beforeDisabled = await p.evaluate(() => {
    const cbs = document.querySelectorAll('input[type="checkbox"]');
    return Array.from(cbs).some(cb => cb.disabled);
  });
  ok("打卡checkbox无disabled", !beforeDisabled);
  
  console.log(`\n📊 结果: ${pass}/${total} 通过`);
  await ctx.close();
  await browser.close();
}
main().catch(e => console.error("ERR:", e));
