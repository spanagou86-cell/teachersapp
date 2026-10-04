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
  page.on("console", (m) => m.type() === "error" && errors.push(`${name}: ${m.text()} ${m.location()?.url ?? ""}`));
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("dialog", (d) => d.accept());
  page.on("response", (r) => r.status() === 404 && console.log(`  · 404 ${r.url()}`));
  const shot = (n) => page.screenshot({ path: path.join(OUT, `${name}-${n}.png`), fullPage: true });

  await page.goto(BASE);
  // No account: start the demo from the login screen.
  await page.waitForURL("**/login");
  await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
  await page.getByText(/Καλημέρα, Σπύρο/).waitFor();
  await shot("01-today");
  const todayHeight = await page.evaluate(() => document.documentElement.scrollHeight / window.innerHeight);
  console.log(`  · Today is ${todayHeight.toFixed(2)} screens tall`);

  // 1. Upload → wizard (from the materials library)
  await page.goto(`${BASE}/materials`);
  await page.locator("input[type=file]").first().setInputFiles(pdf);
  await page.waitForURL("**/materials/new");
  await page.getByText("Το αρχείο ανέβηκε").waitFor();
  await page.getByRole("radio", { name: "Προχωρημένο" }).click();
  await shot("02-wizard");
  await page.getByRole("button", { name: "Ετοίμασε το υλικό" }).click();
  await page.waitForURL(/\/materials\/[0-9a-f-]{36}/);
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
  await page.getByText("Υλικό μαθήματος").waitFor(); // lesson hasn't started: "Πριν" stage
  assert((await page.getByText("2 αρχεία").count()) > 0, "lesson shows 2 files");

  // 4. Attendance: mark 2 absent, survives reload
  await page.goto(`${BASE}/classes/d1`);
  await page.getByRole("button", { name: /Γιώργος Δ\./ }).click();
  await page.getByRole("button", { name: /Πέτρος Σ\./ }).click();
  await page.reload();
  await page.getByText("παρόντες").first().waitFor();
  const counts = await page.locator("p.text-2xl").allTextContents();
  assert(counts[0] === "22" && counts[1] === "2" && counts[2] === "0", `attendance 22/2/0 after reload (got ${counts})`);
  await page.getByRole("button", { name: /Πέτρος Σ\./ }).click(); // absent → late
  await page.waitForTimeout(150);
  const late = await page.locator("p.text-2xl").allTextContents();
  assert(late[0] === "23" && late[1] === "1" && late[2] === "1", `second tap marks late (got ${late})`);
  await shot("06-attendance");

  // 5. Lesson log + carry over with conflict check
  await page.goto(`${BASE}/lessons/l-2026-10-05-0920`);
  await page.getByRole("button", { name: /Μετά/ }).click();
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

  for (const [n, url] of [["09-schedule", "/schedule"], ["09b-month", "/schedule?view=month"], ["09c-year", "/schedule?view=year"], ["10-materials", "/materials"], ["11-progress", "/classes/d1?tab=progress"], ["11b-student", "/students/d1-s1"], ["12-today-after", "/"], ["13-settings", "/settings"], ["13b-about", "/about"]]) {
    await page.goto(BASE + url);
    await page.waitForTimeout(400);
    await shot(n);
  }
  await page.goto(materialUrl);
  await page.waitForTimeout(300);
  await shot("14-editor-final");
  await ctx.close();
}

/** Same screens on a device set to dark mode ("Συσκευής" theme). */
async function dark(name, viewport, mobile) {
  console.log(`\n## ${name}`);
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, locale: "el-GR", colorScheme: "dark" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(BASE);
  await page.waitForURL("**/login");
  await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
  await page.getByText(/Καλημέρα, Σπύρο/).waitFor();
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  assert(bg === "rgb(15, 22, 18)", `dark background follows the device (${bg})`);
  for (const [n, url] of [["01-today", "/"], ["02-schedule", "/schedule"], ["03-attendance", "/classes/d1"], ["04-lesson", "/lessons/l-2026-10-05-0920"], ["05-settings", "/settings"]]) {
    await page.goto(BASE + url);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `${name}-${n}.png`), fullPage: true });
  }
  // "Φωτεινό" overrides the device.
  await page.getByRole("radio", { name: /Φωτεινό/ }).click();
  const light = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  assert(light === "rgb(246, 246, 241)", `"Φωτεινό" forces the light theme (${light})`);
  await page.reload();
  assert((await page.evaluate(() => document.documentElement.dataset.theme)) === "light", "theme choice survives reload");
  await ctx.close();
}

/** Legal pages, data export, installable app and offline behaviour. */
async function trust(name) {
  console.log(`\n## ${name}`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "el-GR", acceptDownloads: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));

  // Legal pages are public: no account, no redirect to /login.
  for (const [path, heading] of [["/legal/privacy", "Πολιτική απορρήτου"], ["/legal/terms", "Όροι χρήσης"], ["/legal/dpa", /Σύμβαση επεξεργασίας/]]) {
    await page.goto(BASE + path);
    await page.getByRole("heading", { level: 1, name: heading }).waitFor();
    assert(new URL(page.url()).pathname === path, `${path} opens without an account`);
  }
  await page.screenshot({ path: path.join(OUT, `${name}-01-privacy.png`), fullPage: true });

  const manifest = await (await page.request.get(`${BASE}/manifest.webmanifest`)).json();
  assert(manifest.name === "τάξη" && manifest.icons.length === 3, "manifest is served with name and icons");
  assert((await page.request.get(`${BASE}/icons/icon-512.png`)).ok(), "app icon is served");

  await page.goto(BASE + "/login");
  await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
  await page.getByText(/Καλημέρα, Σπύρο/).waitFor();
  const sw = await page.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise((r) => setTimeout(() => r(false), 8000))]));
  assert(sw, "service worker is active");

  // Export from the settings page.
  await page.goto(BASE + "/settings");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Λήψη" }).click()]);
  const data = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
  assert(Array.isArray(data.classes) && data.classes.length > 0 && Array.isArray(data.students), `data export contains the classes and students (${download.suggestedFilename()})`);
  await page.screenshot({ path: path.join(OUT, `${name}-02-settings.png`), fullPage: true });

  // No signal: pages already opened come from the cache, unknown ones show the offline page.
  await page.reload();
  await ctx.setOffline(true);
  await page.goto(BASE + "/settings").catch(() => undefined);
  assert((await page.getByText("Σχολείο & χρονιά").count()) > 0, "a visited page opens offline");
  await page.goto(BASE + "/students/d1-s2").catch(() => undefined);
  await page.waitForTimeout(1000);
  const body = await page.locator("body").innerText();
  // Either the real page (when the worker still reaches the server) or our Greek offline page — never the browser's error screen.
  assert(/Δεν υπάρχει σύνδεση|Χρονολόγιο/.test(body) && !/ERR_INTERNET_DISCONNECTED/.test(body), "an unvisited page never shows the browser's error screen");
  await ctx.setOffline(false);
  await ctx.close();
}

try {
  await flow("mobile", { width: 390, height: 844 }, true);
  await flow("desktop", { width: 1440, height: 900 }, false);
  await dark("dark-mobile", { width: 390, height: 844 }, true);
  await dark("dark-desktop", { width: 1440, height: 900 }, false);
  await trust("trust");
} finally {
  await browser.close();
}
const real = errors.filter((e) => !/favicon/.test(e));
console.log(real.length ? `\nConsole errors:\n${real.join("\n")}` : "\nNo console errors.");
process.exit(real.length ? 1 : 0);
