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

  // 1. «✨ Ετοίμασε» from anywhere: it opens on the next lesson, one tap makes a test and files it there.
  const prepare = mobile ? page.getByRole("navigation", { name: "Κύρια πλοήγηση" }).getByRole("button", { name: /Ετοίμασε/ }) : page.locator("aside").getByRole("button", { name: /Ετοίμασε/ });
  await prepare.click();
  const sheet = page.getByRole("dialog", { name: "Ετοίμασε" });
  await sheet.getByText("Μαθηματικά · Δ1").waitFor();
  assert((await sheet.getByLabel("Θέμα μαθήματος").inputValue()) === "Γραφικές παραστάσεις", "«Ετοίμασε» opens on the next lesson, with its topic");
  await shot("02-prepare");
  await sheet.getByRole("button", { name: /Τεστ 10′/ }).click();
  await page.waitForURL(/\/materials\/[0-9a-f-]{36}\?created=1&slot=l-2026-10-05-0920/);
  await page.getByText("Το υλικό είναι έτοιμο.").waitFor();
  assert(true, "one tap: a 10′ test, filed in the 09:20 lesson");

  // 2. Upload: the file goes straight to the library; a worksheet is made from it on request.
  await page.goto(`${BASE}/materials`);
  await page.locator("input[type=file]").first().setInputFiles(pdf);
  await page.waitForURL(/\/materials\/[0-9a-f-]{36}$/);
  await page.getByText("Φτιάξε φύλλο από αυτό το αρχείο").waitFor();
  assert(true, "upload files the PDF as it is, no forced wizard");
  await page.getByRole("main").getByRole("button", { name: "Ετοίμασε", exact: true }).click();
  await sheet.getByText("Με βάση τη σελίδα σου").waitFor();
  await sheet.getByRole("button", { name: /Φύλλο εργασίας/ }).click();
  await page.waitForURL(/\/materials\/[0-9a-f-]{36}\?created=1/);
  await page.getByText("Το υλικό είναι έτοιμο.").waitFor();
  const materialUrl = page.url().split("?")[0];
  assert(true, "worksheet made from the uploaded file");
  await shot("03-editor");

  // 3. Change exercise 2 with AI: the proposal shows on the sheet, with Εφαρμογή / Ακύρωση.
  const actions = page.getByRole("toolbar", { name: "Ενέργειες φύλλου" });
  assert((await actions.getByRole("button").count()) === 4, "the sheet has four actions: save, edit, change, print");
  await actions.getByRole("button", { name: "Άλλαξέ το" }).click();
  await page.getByRole("textbox", { name: "Οδηγία" }).fill("Άλλαξε μόνο τη δεύτερη άσκηση, πιο απλά.");
  await page.getByRole("button", { name: "Δημιουργία πρότασης" }).click();
  await page.getByRole("button", { name: /Εφαρμογή/ }).first().waitFor();
  await shot("04-suggestion");
  await page.getByRole("button", { name: /Εφαρμογή/ }).first().click();
  await page.getByRole("button", { name: "Περισσότερα" }).click();
  await page.getByRole("menuitem", { name: "Ιστορικό αλλαγών" }).click();
  const history = page.getByRole("region", { name: "Ιστορικό αλλαγών" });
  await history.getByText("Δημιουργία από αρχείο").waitFor();
  assert((await history.locator("li").count()) === 2, "AI change recorded in history (2 versions)");
  await history.locator("li", { hasText: "Δημιουργία από αρχείο" }).hover();
  await history.locator("li", { hasText: "Δημιουργία από αρχείο" }).getByRole("button", { name: "Επαναφορά" }).click();
  await page.waitForTimeout(200);
  assert((await history.locator("li").count()) === 3, "restore creates a new version (3)");
  await page.getByText(/^Επαναφορά: Δημιουργία/).first().waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog", { name: "Ιστορικό αλλαγών" }).waitFor({ state: "detached" });

  // At least 5 exercises, and «βάλε άλλη μια ερώτηση» adds one more.
  const exercisesOnSheet = () => page.locator('[data-kind="exercise"]:visible').count();
  const before = await exercisesOnSheet();
  assert(before >= 5, `a new worksheet has at least 5 exercises (${before})`);
  await actions.getByRole("button", { name: "Άλλαξέ το" }).click();
  await page.getByRole("textbox", { name: "Οδηγία" }).fill("βάλε άλλη μια ερώτηση");
  await page.getByRole("button", { name: "Δημιουργία πρότασης" }).click();
  await page.getByRole("button", { name: /Εφαρμογή/ }).first().click();
  await page.waitForTimeout(200);
  await page.waitForTimeout(300);
  assert((await exercisesOnSheet()) === before + 1, `«βάλε άλλη μια ερώτηση» adds one exercise (${before} → ${await exercisesOnSheet()})`);
  await actions.getByRole("button", { name: "Άλλαξέ το" }).click();
  await page.getByRole("button", { name: "Μία ακόμη άσκηση" }).click();
  await page.getByRole("button", { name: "Δημιουργία πρότασης" }).click();
  await page.getByRole("button", { name: /Εφαρμογή/ }).first().waitFor();
  await shot("04b-more");
  await page.getByRole("button", { name: /Εφαρμογή/ }).first().click();
  await page.waitForTimeout(200);
  assert((await exercisesOnSheet()) === before + 2, "«Μία ακόμη άσκηση» adds one more");

  // Save: a clear button, and it says where the sheet is kept.
  await actions.getByRole("button", { name: "Αποθήκευση" }).click();
  await actions.getByRole("button", { name: "Αποθηκεύτηκε" }).waitFor();
  assert(true, "«Αποθήκευση» confirms in place, nothing pops up");

  // 4. Link to Monday 09:20 lesson
  await page.getByRole("button", { name: "Περισσότερα" }).click();
  await page.getByRole("menuitem", { name: /^(Βάλε σε μάθημα|Στα μαθήματα)/ }).click();
  const select = page.getByLabel("Μάθημα", { exact: true });
  const option = await select.locator("option", { hasText: "Δευτέρα 5 Οκτ · 09:20" }).getAttribute("value");
  await select.selectOption(option);
  await page.getByRole("button", { name: "Προσθήκη", exact: true }).click();
  await page.getByRole("link", { name: /Δευτέρα 5 Οκτ · 09:20/ }).waitFor();
  assert(true, "linked to Monday 09:20");
  await shot("05-linked");

  await page.goto(`${BASE}/lessons/l-2026-10-05-0920`);
  await page.getByText("Υλικό μαθήματος").waitFor(); // lesson hasn't started: "Πριν" stage
  assert((await page.getByText("3 αρχεία").count()) > 0, "lesson shows 3 files (sheet, test, new worksheet)");

  // 5. Attendance: mark 2 absent, survives reload
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

  // 6. Lesson log + carry over with conflict check
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

/** A device in dark mode still gets the cream page: the app has one look everywhere. */
async function dark(name, viewport, mobile) {
  console.log(`\n## ${name}`);
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, locale: "el-GR", colorScheme: "dark" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(BASE);
  await page.waitForURL("**/login");
  await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
  await page.getByText(/Καλημέρα, Σπύρο/).waitFor();
  for (const [n, url] of [["01-today", "/"], ["02-schedule", "/schedule"], ["03-settings", "/settings"]]) {
    await page.goto(BASE + url);
    await page.waitForTimeout(300);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert(bg === "rgb(246, 244, 238)", `${url}: cream page on a dark-mode device (${bg})`);
    await page.screenshot({ path: path.join(OUT, `${name}-${n}.png`), fullPage: true });
  }
  assert((await page.getByRole("radio", { name: /Φωτεινό/ }).count()) === 0, "no theme switch in settings");
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
  assert((await page.getByRole("heading", { name: "Ρυθμίσεις" }).count()) > 0, "a visited page opens offline");
  await page.goto(BASE + "/students/d1-s2").catch(() => undefined);
  await page.waitForTimeout(1000);
  const body = await page.locator("body").innerText();
  // Either the real page (when the worker still reaches the server) or our Greek offline page — never the browser's error screen.
  assert(/Δεν υπάρχει σύνδεση|Χρονολόγιο/.test(body) && !/ERR_INTERNET_DISCONNECTED/.test(body), "an unvisited page never shows the browser's error screen");
  await ctx.setOffline(false);
  await ctx.close();
}

/**
 * Phone quality gate, on every screen: no sideways panning, no field that makes iOS zoom
 * (text under 16px), a way back on inner pages, no button hidden until hover, and sheet
 * buttons still visible when the on-screen keyboard takes half the screen.
 */
async function mobileQuality(name) {
  console.log(`\n## ${name}`);
  for (const width of [360, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "el-GR" });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
    await page.goto(BASE + "/login");
    await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
    await page.getByText(/Καλημέρα, Σπύρο/).waitFor();
    await page.goto(`${BASE}/materials`);
    const materialHref = await page.locator("a[href^='/materials/']").filter({ hasNotText: "Νέο" }).first().getAttribute("href");

    const top = ["/", "/schedule", "/schedule?view=month", "/schedule?view=year", "/classes", "/materials"];
    const inner = [
      "/classes/d1",
      "/classes/d1?tab=students",
      "/classes/d1?tab=progress",
      "/classes/d1?tab=notes",
      "/students/d1-s1",
      "/lessons/l-2026-10-05-0920",
      "/materials/new",
      materialHref,
      "/journal?class=d1",
      "/journal?view=plan&class=d1",
      "/settings",
      "/settings/timetable",
      "/about",
      "/legal/privacy",
    ];
    const problems = [];
    for (const url of [...top, ...inner]) {
      await page.goto(BASE + url);
      await page.waitForTimeout(350);
      const r = await page.evaluate(() => {
        const doc = document.documentElement;
        const small = [...document.querySelectorAll("input, textarea, select")]
          .filter((el) => !["checkbox", "radio", "hidden", "file", "range"].includes(el.type) && el.offsetParent !== null)
          .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
          .map((el) => el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.tagName);
        const hidden = [...document.querySelectorAll("button, a")]
          .filter((el) => el.offsetParent !== null && getComputedStyle(el).opacity === "0")
          .map((el) => el.getAttribute("aria-label") || el.textContent.trim().slice(0, 30));
        return { overflow: doc.scrollWidth - doc.clientWidth, small, hidden, back: !!document.querySelector('[aria-label="Πίσω"]') };
      });
      if (r.overflow > 0) problems.push(`${url}: ${r.overflow}px sideways`);
      if (r.small.length) problems.push(`${url}: zooming fields ${r.small.join(", ")}`);
      if (r.hidden.length) problems.push(`${url}: hidden buttons ${r.hidden.join(", ")}`);
      if (inner.includes(url) && !r.back) problems.push(`${url}: no back button`);
    }
    assert(problems.length === 0, `${width}px: ${top.length + inner.length} screens pass (sideways, zoom, back, hidden)${problems.length ? `\n    ${problems.join("\n    ")}` : ""}`);

    // Sheets with the keyboard open (half the screen left): the save button stays reachable.
    const sheets = [
      [
        "/",
        async () => page.getByRole("navigation", { name: "Κύρια πλοήγηση" }).getByRole("button", { name: /Ετοίμασε/ }).click(),
        async () => page.getByRole("dialog").getByRole("button", { name: "Σημείωση" }).click(),
        "Αποθήκευση",
      ],
      ["/classes", async () => page.getByRole("button", { name: /Νέο τμήμα/ }).click(), null, "Αποθήκευση"],
      ["/lessons/l-2026-10-05-0920", async () => page.getByRole("button", { name: /Αλλαγή ώρας/ }).click(), null, "Αποθήκευση"],
      ["/students/d1-s1", async () => page.getByRole("button", { name: "Επεξεργασία" }).click(), null, "Αποθήκευση"],
    ];
    for (const [url, open, next, save] of sheets) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(BASE + url);
      await page.waitForTimeout(300);
      await open();
      if (next) await next();
      const field = page.locator('[role="dialog"] input:not([type=checkbox]), [role="dialog"] textarea').first();
      await field.click();
      await page.setViewportSize({ width, height: 420 });
      await page.waitForTimeout(350);
      const box = await page.locator('[role="dialog"]').getByRole("button", { name: save, exact: true }).last().boundingBox();
      assert(box && box.y >= 0 && box.y + box.height <= 420, `${width}px ${url}: «${save}» visible with the keyboard open (${box ? Math.round(box.y + box.height) : "none"} ≤ 420)`);
    }
    await page.setViewportSize({ width, height: 800 });
    await page.goto(BASE + "/");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${name}-${width}-today.png`), fullPage: true });
    await ctx.close();
  }
}

/** Cyprus: the school comes from the Ministry list; signing out from the sidebar. */
async function schoolAndSignOut(name) {
  console.log(`\n## ${name}`);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "el-GR" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(BASE + "/login");
  await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
  await page.getByText(/Καλημέρα, Σπύρο/).waitFor();
  await page.goto(BASE + "/settings");
  await page.getByRole("radio", { name: "Κύπρος" }).click();
  await page.getByText(/άλλαξε σε Κύπρου/).waitFor();
  await page.getByRole("button", { name: "Το σχολείο σου" }).click();
  await page.getByRole("textbox", { name: "Αναζήτηση σχολείου" }).fill("λατσιων γ");
  await page.getByRole("option", { name: /Λατσιών Γ΄/ }).click();
  await page.waitForTimeout(300);
  assert((await page.getByRole("button", { name: "Το σχολείο σου" }).innerText()).includes("Δημοτικό Σχολείο Λατσιών Γ΄"), "school picked from the Cyprus list");
  await page.getByRole("button", { name: "Το σχολείο σου" }).click();
  await page.getByRole("textbox", { name: "Αναζήτηση σχολείου" }).fill("Ιδιωτικό Σχολείο Ηλιαχτίδα");
  await page.getByRole("button", { name: /Κράτησε/ }).click();
  await page.waitForTimeout(300);
  assert((await page.getByRole("button", { name: "Το σχολείο σου" }).innerText()).includes("Ηλιαχτίδα"), "a school not on the list can be kept as typed");
  await page.getByLabel("Τοπική γιορτή σχολείου").fill("2026-12-07");
  await page.getByText(/χωρίς μαθήματα κάθε χρόνο/).waitFor();
  await page.screenshot({ path: path.join(OUT, `${name}-01-settings.png`), fullPage: true });
  await page.goto(BASE + "/schedule?view=year");
  for (const h of ["Αποστόλου Βαρνάβα", "Αναλήψεως", "Τοπική γιορτή"]) assert((await page.getByText(h).count()) > 0, `Cyprus year shows «${h}»`);
  assert((await page.getByText("Κατακλυσμός").count()) === 0, "no holiday after the last school day (16/6)");
  await page.goto(BASE + "/");
  await page.getByText(/Καλημέρα, Σπύρο/).waitFor();
  assert((await page.getByText("Ελληνικά").count()) > 0 && (await page.getByText("Γλώσσα", { exact: true }).count()) === 0, "Cypriot subject names (Ελληνικά, not Γλώσσα)");
  await page.screenshot({ path: path.join(OUT, `${name}-02-today-cy.png`), fullPage: true });
  await page.getByRole("button", { name: "Έξοδος από την επίδειξη" }).click();
  await page.waitForURL("**/login");
  assert(true, "sidebar sign-out returns to the login page");
  await ctx.close();
}

/** Editing everywhere keeps the text: block editor, lesson day/time, delete + undo, student move, school name. */
async function editingFlow(name) {
  console.log(`\n## ${name}`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "el-GR" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("dialog", (d) => d.accept());
  await page.goto(BASE + "/login");
  await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
  await page.getByText(/Καλημέρα, Σπύρο/).waitFor();

  // School name: saved by itself, shown at the top of the main screens.
  await page.goto(BASE + "/settings");
  const school = page.getByLabel("Το σχολείο σου");
  await school.fill("12ο Δημοτικό Σχολείο Λάρισας");
  await school.blur();
  await page.goto(BASE + "/classes");
  assert((await page.getByText("12ο Δημοτικό Σχολείο Λάρισας").count()) > 0, "school name shows in the phone header");

  // Block editor: typing, then tapping another block, keeps the text.
  await page.goto(`${BASE}/materials`);
  await page.locator("a[href^='/materials/']").filter({ hasNotText: "Νέο" }).first().click();
  await page.waitForURL(/\/materials\/[0-9a-z-]+$/);
  const doc = page.locator("article");
  const blocks = doc.locator("p.whitespace-pre-line");
  await page.getByRole("toolbar", { name: "Ενέργειες φύλλου" }).getByRole("button", { name: "Επεξεργασία" }).click();
  await blocks.nth(1).click();
  await page.getByRole("button", { name: "Επεξεργασία" }).click();
  await page.getByLabel("Κείμενο", { exact: true }).fill("Γράψε τρία παραδείγματα με κλάσματα.");
  await blocks.nth(2).click();
  await page.waitForTimeout(200);
  assert((await doc.getByText("Γράψε τρία παραδείγματα με κλάσματα.").count()) > 0, "block text kept after tapping another block");

  // Lesson: change its time, then delete and undo.
  await page.goto(`${BASE}/lessons/l-2026-10-08-1020`);
  await page.getByRole("button", { name: /Αλλαγή ώρας/ }).click();
  await page.getByLabel("Έναρξη").fill("13:00");
  await page.getByRole("button", { name: "Αποθήκευση", exact: true }).click();
  await page.getByText(/13:00–13:40/).waitFor();
  assert(true, "lesson moved to 13:00 (length kept)");
  await page.getByRole("button", { name: /Αλλαγή ώρας/ }).click();
  await page.getByRole("button", { name: "Διαγραφή μαθήματος" }).click();
  await page.waitForURL(/\/schedule/);
  await page.getByRole("button", { name: "Αναίρεση" }).click();
  await page.goto(`${BASE}/lessons/l-2026-10-08-1020`);
  assert((await page.getByText(/13:00–13:40/).count()) > 0, "deleted lesson comes back with «Αναίρεση»");

  // Long note: fully visible, no hidden text.
  await page.goto(`${BASE}/classes/d1?tab=notes`);
  const long = "Πολύ μεγάλη σημείωση. ".repeat(20).trim();
  await page.getByLabel("Νέα σημείωση").fill(long);
  await page.getByRole("button", { name: /Προσθήκη σημείωσης/ }).click();
  const note = page.getByLabel("Κείμενο σημείωσης").first();
  const fits = await note.evaluate((el) => el.scrollHeight <= el.clientHeight + 2);
  assert(fits, "a long note is shown in full (no hidden text)");

  // Student: move to another class.
  await page.goto(`${BASE}/students/d1-s1`);
  await page.getByRole("button", { name: "Επεξεργασία" }).click();
  await page.locator('[role="dialog"] select').selectOption({ index: 1 });
  await page.getByRole("button", { name: "Αποθήκευση", exact: true }).click();
  await page.getByText(/Μεταφέρθηκε στο/).waitFor();
  assert(true, "student moved to another class");
  await ctx.close();
}

/** Ύλη (what was taught) and Εβδομαδιαίος προγραμματισμός: gaps, filling in place, printing. */
async function journalFlow(name) {
  console.log(`\n## ${name}`);
  for (const [vp, mobile, tag] of [[{ width: 390, height: 844 }, true, "mobile"], [{ width: 1280, height: 900 }, false, "desktop"]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, locale: "el-GR" });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
    await page.goto(BASE + "/login");
    await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
    await page.getByText(/Καλημέρα, Σπύρο/).waitFor();

    // From the class page, through the "Πρόοδος" tab.
    await page.goto(`${BASE}/classes/d1?tab=progress`);
    await page.getByRole("link", { name: "Ύλη" }).click();
    await page.waitForURL(/\/journal\?class=d1/);
    await page.getByText("1 μάθημα χωρίς σημείωση").waitFor();
    assert(true, `${tag}: the month shows the lesson without a record`);

    await page.getByRole("button", { name: "Συμπλήρωση" }).click();
    await page.getByLabel(/Δευτέρα 5 Οκτ · 08:00 · Γλώσσα/).fill("Ασκήσεις ορθογραφίας 1–4");
    await page.getByRole("button", { name: "Αποθήκευση" }).click();
    await page.getByText("Αποθηκεύτηκε").first().waitFor();
    assert((await page.getByText(/\d+ μαθήματ?α? χωρίς σημείωση/).count()) === 0, `${tag}: filled in place, no gaps left`);
    assert((await page.getByText("Ασκήσεις ορθογραφίας 1–4").count()) > 0, `${tag}: the new line appears in the journal`);
    await page.screenshot({ path: path.join(OUT, `${name}-${tag}-01-log.png`), fullPage: true });

    await page.getByRole("radio", { name: "Τρίμηνο" }).click();
    await page.getByText(/Α΄ τρίμηνο|τρίμηνο/).first().waitFor();
    await page.getByRole("radio", { name: "Προγραμματισμός" }).click();
    await page.waitForURL(/view=plan/);
    await page.screenshot({ path: path.join(OUT, `${name}-${tag}-02-plan.png`), fullPage: true });
    if (!mobile) {
      await page.goto(`${BASE}/journal?class=d1&period=term`);
      await page.waitForTimeout(400);
      await page.pdf({ path: path.join(OUT, `${name}-term.pdf`), format: "A4" });
      assert(fs.statSync(path.join(OUT, `${name}-term.pdf`)).size > 10_000, "term journal prints to an A4 PDF");
    }
    await ctx.close();
  }
}

/** «Ετοίμασε» in the background: three levels, the toast, the lesson with Α/Β/Γ; a lesson plan in phases. */
async function prepareFlow(name) {
  console.log(`\n## ${name}`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "el-GR" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(BASE + "/login");
  await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
  await page.getByText(/Καλημέρα, Σπύρο/).waitFor();
  const next = page.getByText(/Σήμερα ακόμη: 2 μαθήματα χωρίς υλικό/);
  await next.waitFor();
  assert(true, "Today suggests the next step: 2 lessons without material");

  // From the lesson's «Πριν»: three levels, then keep working while it's made.
  await page.goto(`${BASE}/lessons/l-2026-10-05-1020`);
  await page.getByText("Ετοίμασε για αυτό το μάθημα").waitFor();
  await page.getByRole("button", { name: /3 επίπεδα/ }).click();
  await page.getByRole("button", { name: "Συνέχισε σε άλλη δουλειά" }).click();
  const tab = page.getByRole("navigation", { name: "Κύρια πλοήγηση" }).getByRole("button", { name: /Φτιάχνω/ });
  assert((await tab.count()) === 1, "the centre button shows the job running");
  await page.getByText("Έτοιμα τα 3 φύλλα: Α, Β, Γ").waitFor();
  await page.getByRole("button", { name: "Άνοιγμα" }).click();
  await page.waitForURL(/\/lessons\/l-2026-10-05-1020/);
  for (const l of ["Α", "Β", "Γ"]) assert((await page.getByText(new RegExp(`Επίπεδο ${l}$`)).count()) > 0, `lesson has the «Επίπεδο ${l}» sheet`);
  await page.screenshot({ path: path.join(OUT, `${name}-01-levels.png`), fullPage: true });

  // A lesson plan: phases as sections, no answer lines.
  await page.getByRole("button", { name: /Σχέδιο μαθήματος/ }).click();
  await page.waitForURL(/\/materials\/[0-9a-f-]{36}\?created=1/);
  await page.getByRole("heading", { name: /Αφόρμηση/ }).waitFor();
  assert((await page.locator("article h3").count()) >= 5, "lesson plan has its phases as sections");
  await page.screenshot({ path: path.join(OUT, `${name}-02-plan.png`), fullPage: true });

  // Delete with undo, no browser dialog.
  await page.goto(`${BASE}/materials`);
  const rows = page.locator("ul li").filter({ has: page.getByRole("button", { name: /^Διαγραφή:/ }) });
  const before = await rows.count();
  await rows.first().getByRole("button", { name: /^Διαγραφή:/ }).click();
  await page.waitForTimeout(150);
  assert((await rows.count()) === before - 1, "material removed at once");
  await page.getByRole("button", { name: "Αναίρεση" }).click();
  await page.waitForTimeout(150);
  assert((await rows.count()) === before, "«Αναίρεση» brings it back");

  // Search and the bell on the phone.
  await page.goto(BASE + "/");
  await page.getByRole("button", { name: "Αναζήτηση" }).click();
  await page.getByRole("dialog").getByRole("textbox", { name: "Αναζήτηση" }).fill("μαρια");
  await page.getByRole("dialog").getByRole("link", { name: /Μαρία Κ\./ }).click();
  await page.waitForURL(/\/students\/d1-s1/);
  assert(true, "phone search finds a pupil and opens their page");
  await ctx.close();
}

/** The syllabus, given once: topics over the year; a lesson that didn't happen moves it on. */
async function programmeFlow(name) {
  console.log(`\n## ${name}`);
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "el-GR", ...(w < 500 && { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }) });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
    await page.goto(BASE + "/login");
    await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
    await page.getByText(/Καλημέρα, Σπύρο/).waitFor();
    await page.goto(`${BASE}/journal?view=plan&class=all&d=2026-10-05`);
    await page.getByRole("radio", { name: "Δεκαπενθήμερο" }).click();
    await page.getByRole("heading", { name: "Δεκαπενθήμερος προγραμματισμός" }).first().waitFor();
    assert(true, `${w}px: fortnightly programme opens`);
    await page.getByRole("button", { name: "Συμπλήρωσε στόχους" }).click();
    await page.getByText(/Στόχοι σε \d+ μαθήματα/).waitFor();
    const text = w < 500 ? await page.locator("main").innerText() : await page.locator("article textarea").first().inputValue();
    assert(/Να κατανοήσουν/.test(text), `${w}px: objectives filled in for the lessons`);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(wide <= 0, `${w}px: programme page doesn't scroll sideways (${wide})`);
    await page.screenshot({ path: path.join(OUT, `${name}-${w}.png`), fullPage: false });
    if (w > 500) {
      await page.getByRole("button", { name: "Αναίρεση" }).click();
      await page.waitForTimeout(300);
      assert((await page.locator("article textarea").first().inputValue()) === "", "undo clears the objectives again");
    }
    await ctx.close();
  }
}

async function dutyFlow(name) {
  console.log(`\n## ${name}`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "el-GR" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(BASE + "/login");
  await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
  await page.getByText(/Καλημέρα, Σπύρο/).waitFor();
  await page.goto(`${BASE}/settings/timetable`);
  const grid = page.getByRole("grid", { name: /ανά μέρα και διάλειμμα/ });
  await grid.waitFor();
  const cell = grid.getByRole("button", { name: /Δευτέρα 10:00/ });
  assert((await cell.getAttribute("aria-pressed")) === "false", "duty grid shows the breaks of the timetable");
  await cell.click();
  assert((await cell.getAttribute("aria-pressed")) === "true", "one tap marks a duty on a break");
  assert(await grid.getByText("Πρωινή").isVisible(), "the morning duty before the bell has its own row");
  await grid.getByRole("button", { name: "Όλη τη μέρα: Πέμπτη" }).click();
  const thursday = grid.getByRole("button", { name: /^(Εφημερία|Παιδονομία) Πέμπτη/ });
  const states = await thursday.evaluateAll((els) => els.map((e) => e.getAttribute("aria-pressed")));
  assert(states.length >= 3 && states.every((x) => x === "true"), `tapping the day marks the morning and every break (${states.length})`);
  await page.getByRole("button", { name: "Άλλη ώρα κάθε εβδομάδα" }).click();
  await page.getByLabel("Από", { exact: true }).fill("09:20");
  await page.getByLabel("Έως", { exact: true }).fill("09:35");
  await page.getByRole("group", { name: "Μέρες" }).getByRole("button", { name: "ΤΕΤ" }).click();
  await page.getByRole("button", { name: "Προσθήκη", exact: true }).click();
  assert(await grid.getByRole("row").filter({ hasText: "09:20–09:35" }).getByText("Άλλη ώρα").isVisible(), "another weekly duty time gets its own row");
  assert((await grid.getByRole("button", { name: /Τετάρτη 09:20/ }).getAttribute("aria-pressed")) === "true", "…marked on the chosen day");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(wide <= 0, `duty grid fits the phone (${wide})`);
  await page.screenshot({ path: path.join(OUT, `${name}-grid.png`) });
  await page.getByRole("button", { name: "Αποθήκευση προγράμματος" }).click();
  await page.waitForURL(BASE + "/");
  await page.goto(`${BASE}/schedule?view=week&d=2026-10-12`);
  await page.getByText(/Εφημερία|Παιδονομία/).first().waitFor();
  assert(true, "the new duty is in the schedule");
  await page.getByRole("button", { name: "Περισσότερα" }).click();
  await page.getByRole("menuitem", { name: /μία φορά/ }).click();
  const sheet = page.getByRole("dialog", { name: /μία φορά/ });
  await sheet.getByLabel("Σημείο (προαιρετικό)").fill("Αυλή");
  await sheet.getByRole("button", { name: "Προσθήκη" }).click();
  await page.getByText(/θα σε ειδοποιήσω 5′ πριν/).waitFor();
  assert(await page.getByText("· μία φορά").first().isVisible(), "a one-off duty shows in the day");
  await page.getByRole("button", { name: /^Αφαίρεση (εφημερία|παιδονομία)/ }).first().click();
  await page.getByText(/αφαιρέθηκε για αυτή τη μέρα/).waitFor();
  assert(true, "a duty can be taken off a single day, with undo");
  await page.goto(`${BASE}/settings`);
  await page.getByText(/Υπενθύμιση (εφημερία|παιδονομία)ς? 5′ πριν|Υπενθύμιση .* 5′ πριν/).first().waitFor();
  assert(true, "settings offer the 5′ duty reminder");
  await ctx.close();
}

async function cyDutyFlow(name) {
  console.log(`\n## ${name}`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "el-GR" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(BASE + "/login");
  await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
  await page.getByText(/Καλημέρα, Σπύρο/).waitFor();
  await page.goto(BASE + "/settings");
  await page.getByRole("radio", { name: "Κύπρος" }).click();
  await page.getByText(/άλλαξε σε Κύπρου/).waitFor();
  await page.goto(`${BASE}/settings/timetable`);
  const grid = page.getByRole("grid", { name: /Παιδονομία ανά μέρα και διάλειμμα/ });
  await grid.waitFor();
  const text = await grid.innerText();
  assert(/Πρωινή\s*07:30–07:45/.test(text), "Cyprus: morning duty 07:30–07:45");
  assert(["09:05–09:25", "10:45–10:55", "12:15–12:25"].every((t) => text.includes(t)) && (text.match(/διάλειμμα/g) ?? []).length === 3, "Cyprus: the three official breaks");
  await grid.getByRole("button", { name: "Όλη τη μέρα: Τρίτη" }).click();
  const tue = await grid.getByRole("button", { name: /^Παιδονομία Τρίτη (07:30|09:05|10:45|12:15)$/ }).evaluateAll((els) => els.map((e) => e.getAttribute("aria-pressed")));
  assert(tue.length === 4 && tue.every((x) => x === "true"), "Cyprus: one tap on the day gives the morning and the three breaks");
  await ctx.close();
}

async function bookletFlow(name) {
  console.log(`\n## ${name}`);
  // Two small "photos" of booklet pages.
  const pngA = path.join(OUT, "page-1.png");
  const pngB = path.join(OUT, "page-2.png");
  const PIX = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR42mP8z8DwnwEIGAEAJvQD/qnYqJcAAAAASUVORK5CYII=";
  fs.writeFileSync(pngA, Buffer.from(PIX, "base64"));
  fs.writeFileSync(pngB, Buffer.from(PIX, "base64"));
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "el-GR", ...(w < 500 && { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }) });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
    await page.goto(BASE + "/login");
    await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
    await page.getByText(/Καλημέρα, Σπύρο/).waitFor();
    await page.goto(`${BASE}/materials`);
    await page.getByRole("radio", { name: /^Φυλλάδια/ }).click();
    await page.getByText(/Τα φυλλάδιά σου, πάντα έτοιμα για φωτοτυπία/).waitFor();
    await page.getByRole("button", { name: "Νέο φυλλάδιο" }).first().click();
    const sheet = page.getByRole("dialog", { name: "Νέο φυλλάδιο" });
    await sheet.getByLabel("Αρχεία φυλλαδίου").setInputFiles([pngA, pngB]);
    await sheet.getByText("page-2.png").waitFor();
    await sheet.getByRole("textbox", { name: "Τίτλος" }).fill("Φυλλάδιο κλασμάτων");
    await sheet.getByRole("combobox", { name: "Μάθημα" }).selectOption("math");
    const wide = await sheet.evaluate((el) => [...el.querySelectorAll("*")].filter((x) => x.getBoundingClientRect().right > window.innerWidth + 1).length);
    assert(wide === 0, `${w}px: booklet upload fits the screen (${wide} wider)`);
    await sheet.getByRole("button", { name: "Αποθήκευση" }).click();
    await page.getByText(/Το φυλλάδιο «Φυλλάδιο κλασμάτων» αποθηκεύτηκε/).waitFor({ timeout: 20000 });
    const group = page.getByRole("region", { name: "Μαθηματικά" });
    assert(await group.getByText("Φυλλάδιο κλασμάτων").isVisible(), `${w}px: two photos become one booklet, under Μαθηματικά`);
    if (w > 500) {
      await page.evaluate(() => {
        window.__opened = [];
        window.open = (u) => (window.__opened.push(String(u)), null);
      });
      await group.getByRole("button", { name: "Εκτύπωση: Φυλλάδιο κλασμάτων" }).click();
      await page.waitForFunction(() => !!document.querySelector('iframe[aria-hidden="true"][src^="blob:"]'), null, { timeout: 10000 });
      const ok = await page.evaluate(async () => {
        const f = document.querySelector('iframe[aria-hidden="true"][src^="blob:"]');
        const b = await (await fetch(f.src)).blob();
        const head = new TextDecoder().decode(new Uint8Array(await b.slice(0, 5).arrayBuffer()));
        return head === "%PDF-";
      });
      assert(ok, "«Εκτύπωση» sends the booklet's PDF to the printer");
      await page.screenshot({ path: path.join(OUT, `${name}-list.png`) });
    }
    await ctx.close();
  }
}

async function smartTilesFlow(name) {
  console.log(`\n## ${name}`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "el-GR" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(BASE + "/login");
  await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
  await page.getByText(/Καλημέρα, Σπύρο/).waitFor();
  await page.goto(`${BASE}/lessons/l-2026-10-05-0920`);
  const chips = page.getByRole("group", { name: "Για το μάθημα" });
  await chips.waitFor();
  assert((await chips.innerText()).includes("Προβλήματα"), "a maths lesson offers «Προβλήματα» and «Νοερός υπολογισμός»");
  await chips.getByRole("button", { name: "Νοερός υπολογισμός" }).click();
  await page.waitForURL(/\/materials\//, { timeout: 30000 });
  assert(/Νοερός υπολογισμός/.test(await page.locator("main").innerText()), "the subject's own sheet is made in one tap");
  await page.getByRole("toolbar", { name: "Ενέργειες φύλλου" }).getByRole("button", { name: "Εκτύπωση" }).click();
  const toggle = page.getByRole("switch", { name: "Φιλικό για δυσλεξία" });
  if (await toggle.count()) {
    await toggle.first().click();
    assert((await page.locator("article.paper.dyslexia").count()) > 0, "«Φιλικό για δυσλεξία» changes the printed sheet");
  } else assert(false, "«Φιλικό για δυσλεξία» toggle is reachable");
  await page.screenshot({ path: path.join(OUT, `${name}-dyslexia.png`), fullPage: false });
  await ctx.close();
}

async function sepFlow(name) {
  console.log(`\n## ${name}`);
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "el-GR", ...(w < 500 && { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }) });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
    await page.goto(BASE + "/login");
    await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
    await page.getByText(/Καλημέρα, Σπύρο/).waitFor();
    await page.goto(`${BASE}/classes/d1/sep`);
    await page.getByRole("heading", { name: "Σχολική Έκθεση Προόδου" }).first().waitFor();
    await page.getByRole("button", { name: "Όλη η τάξη ★★★ όπου λείπει" }).click();
    await page.getByText(/★★★ σε \d+ κενά/).waitFor();
    const focus = page.getByRole("radiogroup", { name: "Συγκεντρώνεται στο μάθημα" });
    assert((await focus.getByRole("radio", { name: "Συχνά" }).getAttribute("aria-checked")) === "true", `${w}px: whole class gets ★★★ in one tap`);
    await focus.getByRole("radio", { name: "Τις περισσότερες φορές" }).click();
    assert((await focus.getByRole("radio", { name: "Τις περισσότερες φορές" }).getAttribute("aria-checked")) === "true", `${w}px: one tap changes an exception to ★★★★`);
    let wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(wide <= 0, `${w}px: skills screen doesn't scroll sideways (${wide})`);
    await page.screenshot({ path: path.join(OUT, `${name}-${w}-skills.png`) });
    await page.getByRole("radio", { name: "Μάθηση" }).click();
    await page.getByRole("button", { name: "Όλη η τάξη ★★★ όπου λείπει" }).click();
    await page.getByRole("radiogroup", { name: "Παραγωγή γραπτού λόγου" }).getByRole("radio", { name: "Επιτεύχθηκαν μερικώς" }).click();
    await page.getByRole("radio", { name: "Σχόλια" }).click();
    await page.getByRole("button", { name: "Γράψε προσχέδια" }).click();
    await page.getByText(/Προσχέδια έτοιμα/).waitFor();
    const growth = await page.getByLabel("Ελληνικά · Περιοχές ανάπτυξης").inputValue();
    assert(/παραγωγή γραπτού λόγου/.test(growth), `${w}px: AI draft names the area to grow («${growth.slice(0, 60)}…»)`);
    assert(await page.getByText("Προσχέδιο AI.").isVisible(), `${w}px: draft is marked until checked`);
    await page.getByRole("checkbox", { name: /Τα έλεγξα/ }).check();
    assert(!(await page.getByText("Προσχέδιο AI.").isVisible()), `${w}px: «Τα έλεγξα» clears the draft mark`);
    wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(wide <= 0, `${w}px: comments screen doesn't scroll sideways (${wide})`);
    await page.screenshot({ path: path.join(OUT, `${name}-${w}-texts.png`), fullPage: true });
    if (w > 500) {
      await page.emulateMedia({ media: "print" });
      await page.screenshot({ path: path.join(OUT, `${name}-print.png`), fullPage: true });
      const printed = await page.locator(".print-doc").innerText();
      assert(printed.includes("ΣΧΟΛΙΚΗ ΕΚΘΕΣΗ ΠΡΟΟΔΟΥ") && printed.includes("★★★★") && /παραγωγή γραπτού λόγου/.test(printed), "printed ΣΕΠ has the form, the stars and the comments");
      await page.emulateMedia({ media: "screen" });
      await page.reload();
      await page.getByRole("checkbox", { name: /Τα έλεγξα/ }).waitFor();
      assert(await page.getByRole("checkbox", { name: /Τα έλεγξα/ }).isChecked(), "ΣΕΠ is still there after a reload");
    }
    await ctx.close();
  }
}

async function syllabusFlow(name) {
  console.log(`\n## ${name}`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "el-GR" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(BASE + "/login");
  await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
  await page.getByText(/Καλημέρα, Σπύρο/).waitFor();

  // «Δεν έγινε» → the topic goes to the next lesson.
  await page.getByRole("group", { name: "Πώς πήγε;" }).first().getByRole("button", { name: "Δεν έγινε" }).click();
  await page.getByRole("button", { name: "Πάει στο επόμενο" }).click();
  await page.getByText("Η ύλη προχώρησε μία ώρα").waitFor();
  assert(true, "a lesson that didn't happen moves the syllabus one lesson on");

  await page.goto(`${BASE}/classes/d1?tab=progress`);
  await page.getByRole("button", { name: "Πρόσθεσε ύλη" }).click();
  const sheet = page.getByRole("dialog", { name: "Ύλη μαθήματος" });
  await sheet.getByRole("button", { name: /Γράψε ή επικόλλησε/ }).click();
  await sheet.getByLabel("Θέματα, ένα σε κάθε γραμμή").fill("Ενότητα 1:\nΑριθμοί ως το 10 000 (2)\nΣτρογγυλοποίηση (1)\nΕνότητα 2:\nΚλάσματα (3)");
  await sheet.getByRole("button", { name: "Συνέχεια" }).click();
  await sheet.getByText(/3 θέματα · 6 περίοδοι/).waitFor();
  const wide = await sheet.evaluate((el) => [...el.querySelectorAll("*")].filter((x) => x.getBoundingClientRect().right > window.innerWidth + 1).length);
  assert(wide === 0, `syllabus list stays inside the screen (${wide} wider)`);
  await page.screenshot({ path: path.join(OUT, `${name}-01-review.png`), fullPage: true });
  await page.getByRole("button", { name: /Μοίρασε στα μαθήματα/ }).click();
  await page.getByText(/Θέμα σε \d+ μαθήματα/).waitFor();
  await page.goto(`${BASE}/lessons/l-2026-10-05-0920`);
  await page.getByLabel("Θέμα μαθήματος").first().waitFor();
  assert((await page.getByLabel("Θέμα μαθήματος").first().inputValue()) === "Ενότητα 1: Αριθμοί ως το 10 000", "the next maths lesson gets the first topic");
  await ctx.close();
}

/** Pages of the book → the AI reads them (subject, unit, objectives) → «Όλο το μάθημα» lands in the lesson. */
async function bookPagesFlow(name) {
  console.log(`\n## ${name}`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "el-GR" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(BASE + "/login");
  await page.getByRole("button", { name: "Δοκίμασε χωρίς λογαριασμό" }).click();
  await page.getByText(/Καλημέρα, Σπύρο/).waitFor();
  // Two tiny white «pages».
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=", "base64");
  const pages = [1, 2].map((n) => ({ name: `selida-${n}.png`, mimeType: "image/png", buffer: png }));

  await page.getByRole("navigation", { name: "Κύρια πλοήγηση" }).getByRole("button", { name: /Ετοίμασε/ }).click();
  const sheet = page.getByRole("dialog", { name: "Ετοίμασε" });
  await sheet.getByLabel("Τι θέλεις να ετοιμάσω").fill("6 προβλήματα με ευρώ, τα 2 πρώτα εύκολα");
  await sheet.getByLabel("Σελίδες βιβλίου").setInputFiles(pages);
  await sheet.getByText("Βρήκα", { exact: true }).waitFor();
  assert((await sheet.getByText(/2 σελίδες/).count()) === 1, "two photos become one set of pages");
  assert((await sheet.getByLabel("Τίτλος μαθήματος από τη σελίδα").inputValue()) === "Ισοδύναμα κλάσματα", "the AI reads the unit's title from the page");
  assert((await sheet.getByText(/Ενότητα 3 · σελ\. 42–43/).count()) === 1, "…and its unit and pages");
  assert((await sheet.getByText(/Μαθηματικά · Δ΄/).count()) === 1, "…and recognises the subject and the class");
  await page.screenshot({ path: path.join(OUT, `${name}-01-read.png`), fullPage: true });

  await sheet.getByRole("button", { name: /Όλο το μάθημα/ }).click();
  await sheet.getByText("Γράφω το σχέδιο μαθήματος…").waitFor();
  await page.waitForURL(/\/lessons\/l-2026-10-05-0920$/);
  await page.getByText("Έτοιμο όλο το μάθημα: σχέδιο, φύλλο εργασίας και τεστ εξόδου").waitFor();
  for (const t of ["Σχέδιο μαθήματος", "Τεστ εξόδου"]) assert((await page.getByText(new RegExp(`· ${t}$`)).count()) > 0, `the lesson has the new «${t}»`);
  await page.screenshot({ path: path.join(OUT, `${name}-02-lesson.png`), fullPage: true });
  await ctx.close();
}

try {
  await syllabusFlow("syllabus");
  await programmeFlow("programme");
  await sepFlow("sep");
  await smartTilesFlow("tiles");
  await dutyFlow("duty");
  await cyDutyFlow("duty-cy");
  await bookletFlow("booklets");
  await prepareFlow("prepare");
  await bookPagesFlow("pages");
  await flow("mobile", { width: 390, height: 844 }, true);
  await flow("desktop", { width: 1440, height: 900 }, false);
  await dark("dark-mobile", { width: 390, height: 844 }, true);
  await dark("dark-desktop", { width: 1440, height: 900 }, false);
  await trust("trust");
  await journalFlow("journal");
  await mobileQuality("quality");
  await editingFlow("editing");
  await schoolAndSignOut("school");
} finally {
  await browser.close();
}
const real = errors.filter((e) => !/favicon/.test(e));
console.log(real.length ? `\nConsole errors:\n${real.join("\n")}` : "\nNo console errors.");
process.exit(real.length ? 1 : 0);
