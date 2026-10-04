// End-to-end walk through the main flow. Usage: BASE=http://localhost:3000 OUT=./shots node scripts/e2e.mjs
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "shots";
const EXE = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
fs.mkdirSync(OUT, { recursive: true });

const pdf = path.join(OUT, "mathimatika_d.pdf");
fs.writeFileSync(pdf, "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");

const errors = [];
const assert = (cond, msg) => {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
  console.log(`  ✓ ${msg}`);
};

const browser = await chromium.launch({ executablePath: EXE });

async function flow(name, viewport, mobile) {
  console.log(`\n## ${name}`);
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, locale: "el-GR" });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && errors.push(`${name}: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("dialog", (d) => d.accept());
  const shot = (n) => page.screenshot({ path: path.join(OUT, `${name}-${n}.png`), fullPage: true });

  await page.goto(BASE);
  await page.getByText("Καλημέρα, Σπύρο.").waitFor();
  await shot("01-today");

  // 1. Upload → wizard
  await page.locator('input[type=file]').first().setInputFiles(pdf);
  await page.waitForURL("**/materials/new");
  await page.getByText("Το αρχείο ανέβηκε").waitFor();
  await page.getByRole("radio", { name: "Προχωρημένο" }).click();
  await shot("02-wizard");
  await page.getByRole("button", { name: "Ετοίμασε το υλικό" }).click();
  await page.waitForURL(/\/materials\/m-/);
  await page.getByText("Το υλικό είναι έτοιμο.").waitFor();
  const materialUrl = page.url().split("?")[0];
  assert(true, "material created from upload");
  await shot("03-editor");

  // 2. Adapt exercise 2 with the AI panel
  if (mobile) await page.getByRole("radio", { name: "Προσαρμογή" }).click();
  await page.getByLabel("Οδηγία").fill("Άλλαξε μόνο τη δεύτερη άσκηση, πιο απλά.");
  await page.getByRole("button", { name: "Δημιουργία πρότασης" }).click();
  await page.getByText("Η πρόταση είναι έτοιμη").waitFor();
  await shot("04-suggestion");
  await page.getByRole("button", { name: "Εφαρμογή", exact: true }).click();
  if (mobile) await page.getByRole("radio", { name: "Μάθημα & ιστορικό" }).click();
  const history = page.locator("h2", { hasText: "Ιστορικό αλλαγών" }).locator("..");
  await history.getByText("Δημιουργία από αρχείο").waitFor();
  assert((await history.locator("li").count()) === 2, "AI change recorded in history (2 versions)");
  await history.locator("li", { hasText: "Δημιουργία από αρχείο" }).hover();
  await history.locator("li", { hasText: "Δημιουργία από αρχείο" }).getByRole("button", { name: "Επαναφορά" }).click();
  await page.waitForTimeout(200);
  assert((await history.locator("li").count()) === 3, "restore creates a new version (3)");
  await page.getByText(/^Επαναφορά: Δημιουργία/).first().waitFor();

  // 3. Link to Monday 09:20 lesson
  const select = page.getByLabel("Μάθημα", { exact: true });
  const option = await select.locator("option", { hasText: "Δευτέρα 5 Οκτ · 09:20" }).getAttribute("value");
  await select.selectOption(option);
  await page.getByRole("button", { name: "Προσθήκη", exact: true }).click();
  await page.getByRole("link", { name: /Δευτέρα 5 Οκτ · 09:20/ }).waitFor();
  assert(true, "linked to Monday 09:20");
  await shot("05-linked");

  await page.goto(`${BASE}/lessons/l-2026-10-05-0920`);
  await page.getByText("Υλικό μαθήματος").waitFor();
  assert((await page.getByText("2 αρχεία").count()) > 0, "lesson shows 2 files");

  // 4. Attendance: mark 2 absent, survives reload
  await page.goto(`${BASE}/classes/d1`);
  await page.getByRole("button", { name: /Γιώργος Δ\./ }).click();
  await page.getByRole("button", { name: /Πέτρος Σ\./ }).click();
  await page.reload();
  await page.getByText("παρόντες").first().waitFor();
  const counts = await page.locator("p.text-2xl").allTextContents();
  assert(counts[0] === "22" && counts[1] === "2", `attendance 22/2 after reload (got ${counts})`);
  await shot("06-attendance");

  // 5. Lesson log + carry over with conflict check
  await page.goto(`${BASE}/lessons/l-2026-10-05-0920`);
  await page.getByRole("radio", { name: "Μερικώς" }).click();
  await page.getByLabel("Σημείωση μαθήματος").fill("Κάναμε τις ασκήσεις 1–2.");
  await page.getByRole("button", { name: /ΤΡΙ\s*6/ }).click();
  await page.getByRole("button", { name: /09:20–10:00/ }).click();
  await page.getByRole("alert").filter({ hasText: "Σύγκρουση" }).waitFor();
  assert((await page.getByRole("alert").filter({ hasText: "Σύγκρουση" }).textContent()).includes("Σύγκρουση"), "conflict shown for Tuesday 09:20");
  await shot("07-conflict");
  await page.getByRole("button", { name: /11:40–12:20/ }).click();
  await page.getByRole("button", { name: /^Μεταφορά σε/ }).click();
  await page.getByText("Μεταφέρθηκε", { exact: true }).first().waitFor();
  await page.getByRole("link", { name: /Μεταφέρθηκε σε Τρίτη/ }).click();
  await page.getByText(/Συνέχεια από Δευτέρα/).waitFor();
  assert((await page.getByText("«Κάναμε τις ασκήσεις 1–2.»").count()) > 0, "continuation links back with the note");
  await shot("08-continuation");

  for (const [n, url] of [["09-schedule", "/schedule"], ["10-materials", "/materials"], ["11-progress", "/classes/d1?tab=progress"], ["12-today-after", "/"], ["13-about", "/about"]]) {
    await page.goto(BASE + url);
    await page.waitForTimeout(400);
    await shot(n);
  }
  await page.goto(materialUrl);
  await page.waitForTimeout(300);
  await shot("14-editor-final");
  await ctx.close();
}

try {
  await flow("mobile", { width: 390, height: 844 }, true);
  await flow("desktop", { width: 1440, height: 900 }, false);
} finally {
  await browser.close();
}
const real = errors.filter((e) => !/favicon/.test(e));
console.log(real.length ? `\nConsole errors:\n${real.join("\n")}` : "\nNo console errors.");
process.exit(real.length ? 1 : 0);
