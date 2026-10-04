import { describe, expect, it } from "vitest";
import { carryOverLesson } from "../schedule";
import { materialize, overlappingEntries, periodsFrom, schoolYearEnd } from "../timetable";
import type { LessonSlot, TimetableEntry } from "../types";

const entry = (id: string, weekday: number, start: string, end: string, extra: Partial<TimetableEntry> = {}): TimetableEntry => ({
  id, weekday, start, end, kind: "lesson", classId: "c", subjectId: "math", label: "", ...extra,
});

describe("timetable", () => {
  it("expands the weekly template over weekdays only", () => {
    const occ = materialize([entry("a", 1, "08:00", "08:40"), entry("b", 5, "09:20", "10:00", { kind: "duty", label: "Αυλή" })], "2026-10-05", "2026-10-18");
    expect(occ.map((o) => `${o.templateId} ${o.date}`)).toEqual(["a 2026-10-05", "b 2026-10-09", "a 2026-10-12", "b 2026-10-16"]);
  });

  it("skips occurrences that already exist so re-saving is safe", () => {
    const occ = materialize([entry("a", 1, "08:00", "08:40")], "2026-10-05", "2026-10-12", new Set(["a|2026-10-05"]));
    expect(occ.map((o) => o.date)).toEqual(["2026-10-12"]);
  });

  it("derives grid rows from the template", () => {
    expect(periodsFrom([entry("a", 1, "09:20", "10:00"), entry("b", 2, "08:00", "08:40"), entry("c", 3, "09:20", "10:00")])).toEqual([
      { start: "08:00", end: "08:40" },
      { start: "09:20", end: "10:00" },
    ]);
    expect(periodsFrom([]).length).toBeGreaterThan(3);
  });

  it("finds the end of the school year", () => {
    expect(schoolYearEnd("2026-10-05")).toBe("2027-06-30");
    expect(schoolYearEnd("2027-03-01")).toBe("2027-06-30");
  });

  it("flags overlapping entries on the same day", () => {
    expect([...overlappingEntries([entry("a", 1, "10:00", "10:40"), entry("b", 1, "10:20", "10:30", { kind: "duty" }), entry("c", 2, "10:00", "10:40")])].sort()).toEqual(["a", "b"]);
  });

  it("won't carry a lesson onto yard duty", () => {
    const slots: LessonSlot[] = [{ id: "l", date: "2026-10-05", start: "08:00", end: "08:40", classId: "c", subjectId: "math", topic: "", materialIds: [], status: "partial", taughtNote: "" }];
    const r = carryOverLesson(slots, "l", { date: "2026-10-06", start: "10:00", end: "10:20" }, "n", "2026-10-05", [{ id: "d", date: "2026-10-06", start: "10:00", end: "10:20" }]);
    expect(r.ok).toBe(false);
  });
});
