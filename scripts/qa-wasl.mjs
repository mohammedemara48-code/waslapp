import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"] });

async function inspect(page, name, w, h) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => {
    const mark = document.querySelector(".font-display");
    const r = mark?.getBoundingClientRect();
    return {
      dir: getComputedStyle(document.documentElement).direction,
      lang: document.documentElement.lang,
      markX: r?.x ?? null,
      vw: window.innerWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    };
  });
  const text = await page.locator("body").innerText();
  await page.screenshot({ path: `/workspace/screenshots/${name}.png`, fullPage: true });
  return { name, ...info, textSlice: text.slice(0, 220) };
}

const page = await browser.newPage();
const cons = [];
page.on("console", (m) => { if (m.type() === "error") cons.push(m.text()); });
page.on("pageerror", (e) => cons.push(String(e)));
const desktop = await inspect(page, "landing-desktop", 1280, 800);
const mobile = await inspect(page, "landing-mobile", 390, 844);
console.log(JSON.stringify({ desktop, mobile, cons }, null, 2));
await browser.close();
