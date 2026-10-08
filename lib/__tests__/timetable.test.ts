import { describe, expect, it } from "vitest";
import { carryOverLesson } from "../schedule";
import { BELLS, bellGaps, retimeToBell, materialize, overlappingEntries, periodOrdinal, periodsFrom, schoolYearEnd } from "../timetable";
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

describe("the Cyprus school day", () => {
  it("runs 07:45–13:05: seven periods and three breaks", () => {
    expect(BELLS.cy[0].start).toBe("07:45");
    expect(BELLS.cy.at(-1)!.end).toBe("13:05");
    expect(periodOrdinal(BELLS.cy, "12:25")).toBe("7η");
    expect(periodOrdinal(BELLS.cy, "09:05")).toBeUndefined();
  });
  it("fills what a day leaves empty, never over a lesson", () => {
    const used = [{ start: "07:45", end: "08:25" }, { start: "09:05", end: "09:25" }, { start: "10:00", end: "10:40" }];
    expect(bellGaps(BELLS.cy, used).map((p) => p.start)).toEqual(["08:25", "10:45", "10:55", "11:35", "12:15", "12:25"]);
  });
});

describe("changing country moves the week onto the new bell", () => {
  const e = (id: string, weekday: number, start: string, end: string, kind: TimetableEntry["kind"] = "lesson"): TimetableEntry => ({
    id, weekday, start, end, kind, label: "", ...(kind === "lesson" && { classId: "d1", subjectId: "math" as const }),
  });
  it("keeps each period's place, Cyprus → Greece", () => {
    const week = [e("a", 1, "07:45", "08:25"), e("b", 1, "09:25", "10:05"), e("c", 2, "12:25", "13:05"), e("d", 2, "09:05", "09:25", "duty"), e("m", 3, "07:30", "07:45", "duty")];
    const r = retimeToBell(week, BELLS.cy, BELLS.gr);
    expect(r.entries.map((x) => `${x.id} ${x.start}-${x.end}`)).toEqual([
      "a 08:15-09:00", // 1st period
      "b 10:05-10:50", // 3rd period
      "c 13:15-14:00", // the 7th: after Greece's six
      "d 09:45-10:05", // 1st break
      "m 08:00-08:15", // before the first bell, same 15′
    ]);
    expect(r.unmatched).toBe(0);
  });
  it("and back, Greece → Cyprus; a break Greece lacks is left for the teacher", () => {
    const r = retimeToBell([e("a", 1, "08:15", "09:00"), e("x", 1, "13:30", "14:10")], BELLS.gr, BELLS.cy);
    expect(r.entries.map((x) => x.start)).toEqual(["07:45", "13:30"]);
    expect(retimeToBell([e("d", 1, "12:15", "12:25", "duty")], BELLS.cy, BELLS.gr).unmatched).toBe(1);
  });
  it("there and back gives the same week", () => {
    const week = [e("a", 1, "07:45", "08:25"), e("c", 2, "12:25", "13:05"), e("d", 2, "10:45", "10:55", "duty"), e("x", 4, "13:30", "14:10")];
    const there = retimeToBell(week, BELLS.cy, BELLS.gr).entries;
    expect(retimeToBell(there, BELLS.gr, BELLS.cy).entries).toEqual(week);
  });
});
