import { describe, expect, it } from "vitest";
import { journal, periodFor, shiftPeriod, weekPlan } from "../journal";
import { schoolYear } from "../schoolYear";
import type { LessonSlot } from "../types";

const slot = (p: Partial<LessonSlot> & Pick<LessonSlot, "id" | "date" | "start">): LessonSlot => ({
  end: `${String(Number(p.start.slice(0, 2)) + 1).padStart(2, "0")}:00`,
  classId: "d1",
  subjectId: "math",
  topic: "Κλάσματα",
  materialIds: [],
  status: "done",
  taughtNote: "Ασκήσεις 1–3",
  ...p,
});

describe("periods", () => {
  it("finds week, month, term and year around a date", () => {
    expect(periodFor("week", "2026-10-07", "gr")).toMatchObject({ from: "2026-10-05", to: "2026-10-09" });
    expect(periodFor("month", "2026-02-10", "gr")).toMatchObject({ from: "2026-02-01", to: "2026-02-28", label: "Φεβρουάριος 2026" });
    expect(periodFor("term", "2026-10-07", "gr")).toMatchObject({ from: "2026-09-11", to: "2026-11-30" });
    expect(periodFor("year", "2026-10-07", "gr")).toMatchObject({ from: "2026-09-11", to: "2027-06-15" });
  });
  it("steps across month and year boundaries", () => {
    expect(shiftPeriod("month", "2026-12-15", 1, "gr")).toBe("2027-01-01");
    expect(shiftPeriod("month", "2027-01-15", -1, "gr")).toBe("2026-12-01");
    expect(shiftPeriod("week", "2026-10-07", 1, "gr")).toBe("2026-10-12");
    expect(periodFor("term", shiftPeriod("term", "2026-10-07", 1, "gr"), "gr").from).toBe("2026-12-01");
  });
});

describe("journal", () => {
  const holidays = schoolYear("gr", 2026).holidays;
  const slots = [
    slot({ id: "a", date: "2026-10-26", start: "08:00" }),
    slot({ id: "b", date: "2026-10-27", start: "09:00", status: "partial", carriedToId: "c" }),
    slot({ id: "c", date: "2026-10-29", start: "08:00", carriedFromId: "b" }),
    slot({ id: "d", date: "2026-10-30", start: "08:00", status: "planned", taughtNote: "" }),
    slot({ id: "e", date: "2026-10-30", start: "10:00", classId: "e2" }),
    slot({ id: "f", date: "2026-11-02", start: "08:00", subjectId: "glossa" }),
    slot({ id: "g", date: "2026-11-20", start: "08:00" }), // still in the future
  ];
  const run = (over: Partial<Parameters<typeof journal>[0]> = {}) =>
    journal({ slots, period: { from: "2026-10-01", to: "2026-11-30", label: "" }, classId: "d1", holidays, today: "2026-11-05", now: "12:00", ...over });

  it("lists past lessons of the class by month, with holidays in place", () => {
    const { months, total } = run();
    expect(months.map((m) => m.label)).toEqual(["Οκτώβριος 2026", "Νοέμβριος 2026"]);
    expect(total).toBe(5);
    const oct = months[0].rows.map((r) => (r.type === "lesson" ? r.slot.id : r.label));
    expect(oct).toEqual(["a", "b", "28η Οκτωβρίου", "c", "d"]);
  });
  it("writes remarks for partial and continued lessons", () => {
    const rows = run().months[0].rows;
    const b = rows.find((r) => r.type === "lesson" && r.slot.id === "b");
    const c = rows.find((r) => r.type === "lesson" && r.slot.id === "c");
    expect(b?.type === "lesson" && b.remark).toBe("Μερικώς · συνέχεια 29 Οκτ");
    expect(c?.type === "lesson" && c.remark).toBe("συνέχεια από 27 Οκτ");
  });
  it("flags lessons that took place without a record", () => {
    expect(run().missing.map((s) => s.id)).toEqual(["d"]);
  });
  it("filters by subject", () => {
    expect(run({ subjectId: "glossa" }).total).toBe(1);
  });
});

describe("weekPlan", () => {
  it("groups the week's lessons by day and finds those without a topic", () => {
    const plan = weekPlan({
      slots: [
        slot({ id: "x", date: "2026-11-09", start: "09:00", status: "planned", taughtNote: "" }),
        slot({ id: "y", date: "2026-11-09", start: "08:00", status: "planned", topic: "" }),
        slot({ id: "z", date: "2026-11-11", start: "08:00", status: "planned", carriedToId: "q" }),
      ],
      monday: "2026-11-09",
      classId: "d1",
    });
    expect(plan.days[0].lessons.map((s) => s.id)).toEqual(["y", "x"]);
    expect(plan.days[2].lessons).toHaveLength(0);
    expect(plan.noTopic.map((s) => s.id)).toEqual(["y"]);
  });
  it("covers two school weeks for the fortnightly programme and finds lessons without objectives", () => {
    const plan = weekPlan({
      slots: [
        slot({ id: "a", date: "2026-11-09", start: "08:00", status: "planned", plan: "Να συγκρίνουν κλάσματα" }),
        slot({ id: "b", date: "2026-11-20", start: "08:00", status: "planned" }),
        slot({ id: "c", date: "2026-11-23", start: "08:00", status: "planned" }),
      ],
      monday: "2026-11-09",
      weeks: 2,
    });
    expect(plan.days.map((d) => d.date)).toEqual([
      "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13",
      "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20",
    ]);
    expect(plan.noPlan.map((s) => s.id)).toEqual(["b"]);
  });
});
