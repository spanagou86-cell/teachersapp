// Screenshots of the main screens for design review. Usage: OUT=./shots/before node scripts/shots.mjs
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "shots";
const EXE = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
fs.mkdirSync(OUT, { recursive: true });

const SCREENS = [
  ["today", "/"],
  ["schedule", "/schedule"],
  ["prepare", "/", async (p) => p.getByRole("button", { name: /Ετοίμασε/ }).first().click()],
  ["classes", "/classes"],
  ["class", "/classes/d1"],
  ["lesson", "/lessons/l-2026-10-05-0920"],
  ["materials", "/materials"],
  ["sep", "/classes/d1/sep"],
  ["settings", "/settings"],
];

const browser = await chromium.launch({ executablePath: EXE });
for (const [label, viewport, mobile] of [
  ["phone", { width: 390, height: 844 }, true],
  ["desktop", { width: 1366, height: 860 }, false],
]) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, locale: "el-GR" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/login");
  await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
  await page.getByText(/Καλημέρα, Σπύρο/).waitFor();
  for (const [name, url, act] of SCREENS) {
    await page.goto(BASE + url);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    if (act) {
      await act(page);
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(OUT, `${label}-${name}.png`), fullPage: !act });
  }
  // The first material, in the editor.
  await page.goto(BASE + "/materials");
  await page.locator('a[href^="/materials/"]').first().click();
  await page.waitForURL(/\/materials\/.+/);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, `${label}-material.png`) });
  await ctx.close();
}
await browser.close();
console.log("saved to", OUT);
