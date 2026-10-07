import { startOfWeek } from "./dates";
import type { Material } from "./types";

/**
 * Rough minutes a teacher would spend doing it by hand, on the conservative side.
 * Shown as «περίπου», never as a promise.
 */
const MINUTES: Partial<Record<Material["kind"], number>> = { worksheet: 25, quiz: 20, plan: 25, summary: 15 };
/** Each of the three levels is a lighter variant of the same sheet. */
const PER_LEVEL = 15;
/** A ΣΕΠ report ticked as checked, with the comment drafts. */
const PER_REPORT = 10;

/** Minutes saved since Monday: material made with «Ετοίμασε» and progress reports finished. */
export function minutesSavedThisWeek(materials: Material[], reports: { reviewed: boolean; updatedAt: number }[], today: string): number {
  const from = Date.parse(`${startOfWeek(today)}T00:00:00Z`);
  let minutes = 0;
  for (const m of materials) {
    if (m.createdAt < from || !m.blocks.length) continue;
    minutes += / · Επίπεδο [ΑΒΓ]$/.test(m.title) ? PER_LEVEL : (MINUTES[m.kind] ?? 0);
  }
  for (const r of reports) if (r.reviewed && r.updatedAt >= from) minutes += PER_REPORT;
  return minutes;
}

/** «2 ώ 15′», «40′». */
export const hoursMinutes = (n: number) => (n >= 60 ? `${Math.floor(n / 60)} ώ${n % 60 ? ` ${n % 60}′` : ""}` : `${n}′`);
