
const { chromium } = require("playwright");
const PASS = "306214bf-78b1-493d-9abe-bc649021e3a1";
const USER = "user3";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx = await browser.newContext();
  const p = await ctx.newPage();

  await p.goto("http://localhost/login", { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);

  // 截屏看看页面
  await p.screenshot({ path: "/tmp/before_fill.png" });

  const pageText = await p.textContent("body");
  console.log("页面内容[:200]:", pageText.substring(0, 200));

  // 仔细检查输入框
  const inputs = await p.locator("input").all();
  console.log("输入框数量:", inputs.length);
  for (let i = 0; i < inputs.length; i++) {
    const type = await inputs[i].getAttribute("type");
    const placeholder = await inputs[i].getAttribute("placeholder");
    console.log(`  input[${i}]: type=${type} placeholder="${placeholder}"`);
  }

  // 用更精确的方式定位
  const userInput = p.locator('input').first();
  await userInput.click();
  await userInput.fill(USER);
  
  const passInput = p.locator('input[type="password"]').first();
  await passInput.click();
  await passInput.fill(PASS);

  // 验证已填写
  const userVal = await userInput.inputValue();
  const passVal = await passInput.inputValue();
  console.log("\n填写验证:", `user=["${userVal}"] pass=["${passVal}"]`);

  // 点提交
  const btn = p.locator('button[type="submit"]').first();
  const btnText = await btn.textContent();
  console.log("按钮:", `"${btnText.trim()}"`);

  // 添加点击前监听网络
  const responses = [];
  p.on("response", r => {
    if (r.url().includes("/api/")) {
      responses.push({ url: r.url().replace("http://localhost", ""), status: r.status() });
    }
  });

  await btn.click();
  await p.waitForTimeout(5000);

  console.log("\n登录后URL:", p.url());
  console.log("\nAPI请求:");
  responses.forEach(r => console.log(`  ${r.status} ${r.url}`));

  // 检查是否有错误
  const errEl = p.locator(".error-message");
  const hasErr = await errEl.isVisible().catch(() => false);
  if (hasErr) {
    console.log("\n错误提示:", await errEl.textContent());
  }

  // 检查localStorage
  const ls = await p.evaluate(() => ({
    token: localStorage.getItem("learnhub_token"),
    hasCookie: document.cookie
  }));
  console.log("\nLocalStorage:", JSON.stringify(ls));

  await p.screenshot({ path: "/tmp/after_login.png" });
  await ctx.close();
  await browser.close();
}
main().catch(e => console.error("ERR:", e));
