import { expect, test } from "vitest";
import { hoursMinutes, minutesSavedThisWeek } from "../timeSaved";
import type { Material } from "../types";

const m = (kind: Material["kind"], day: string, title = "Φύλλο"): Material =>
  ({ id: day + kind + title, title, kind, blocks: [{ id: "b", type: "text", text: "x" }], createdAt: Date.parse(`${day}T10:00:00Z`) }) as Material;

test("counts this week's sheets, levels and reports", () => {
  const mats = [m("worksheet", "2026-10-05"), m("quiz", "2026-10-06"), m("worksheet", "2026-10-02"), m("worksheet", "2026-10-07", "Κλάσματα · Επίπεδο Α"), m("file", "2026-10-06")];
  const reports = [{ reviewed: true, updatedAt: Date.parse("2026-10-06T12:00:00Z") }, { reviewed: false, updatedAt: Date.parse("2026-10-06T12:00:00Z") }];
  expect(minutesSavedThisWeek(mats, reports, "2026-10-07")).toBe(25 + 20 + 15 + 10);
  expect(hoursMinutes(70)).toBe("1 ώ 10′");
  expect(hoursMinutes(120)).toBe("2 ώ");
  expect(hoursMinutes(40)).toBe("40′");
});
