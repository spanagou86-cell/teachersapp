import { describe, expect, it } from "vitest";
import { bump, openLessons, parseList, spread, totalPeriods } from "../syllabus";
import type { LessonSlot } from "../types";

const lesson = (id: string, date: string, topic = "", extra: Partial<LessonSlot> = {}): LessonSlot => ({
  id,
  date,
  start: "08:25",
  end: "09:05",
  classId: "d1",
  subjectId: "math",
  topic,
  materialIds: [],
  status: "planned",
  taughtNote: "",
  ...extra,
});

describe("syllabus", () => {
  const slots = [
    lesson("a", "2026-10-12"),
    lesson("b", "2026-10-13"),
    lesson("c", "2026-10-14"),
    lesson("x", "2026-10-14", "", { subjectId: "glossa" }),
    lesson("d", "2026-10-15", "", { taughtNote: "Ήδη έγινε" }),
    lesson("e", "2026-10-16"),
  ];

  it("only uses lessons still to be taught", () => {
    expect(openLessons(slots, "d1", "math", "2026-10-13").map((s) => s.id)).toEqual(["b", "c", "e"]);
  });

  it("spreads topics over lessons by their periods", () => {
    const r = spread(
      [
        { title: "Κλάσματα", periods: 2, unit: "Ενότητα 3" },
        { title: "Δεκαδικοί", periods: 1 },
        { title: "Μετρήσεις", periods: 2 },
      ],
      openLessons(slots, "d1", "math", "2026-10-12"),
    );
    expect(r.patches).toEqual([
      { id: "a", topic: "Ενότητα 3: Κλάσματα" },
      { id: "b", topic: "Ενότητα 3: Κλάσματα" },
      { id: "c", topic: "Δεκαδικοί" },
      { id: "e", topic: "Μετρήσεις" },
    ]);
    expect(r.left).toEqual([]);
    expect(spread([{ title: "Α", periods: 9 }, { title: "Β", periods: 1 }], openLessons(slots, "d1", "math", "2026-10-12")).left.map((x) => x.title)).toEqual(["Β"]);
  });

  it("moves the topics one lesson on when a lesson didn't happen", () => {
    const s = [lesson("a", "2026-10-12", "Κλάσματα"), lesson("b", "2026-10-13", "Δεκαδικοί"), lesson("c", "2026-10-14", "Μετρήσεις"), lesson("e", "2026-10-16", "")];
    expect(bump(s, "a")).toEqual([
      { id: "b", topic: "Κλάσματα" },
      { id: "c", topic: "Δεκαδικοί" },
      { id: "e", topic: "Μετρήσεις" },
    ]);
    expect(bump(s, "e")).toEqual([]);
  });

  it("reads a typed list with units and periods", () => {
    const items = parseList("Ενότητα 1:\n1. Αριθμοί ως το 10 000 (3)\n- Στρογγυλοποίηση - 2 περ.\nΠροβλήματα\n\nΕνότητα 2:\nΚλάσματα (4 περ.)");
    expect(items).toEqual([
      { title: "Αριθμοί ως το 10 000", periods: 3, unit: "Ενότητα 1" },
      { title: "Στρογγυλοποίηση", periods: 2, unit: "Ενότητα 1" },
      { title: "Προβλήματα", periods: 1, unit: "Ενότητα 1" },
      { title: "Κλάσματα", periods: 4, unit: "Ενότητα 2" },
    ]);
    expect(totalPeriods(items)).toBe(10);
  });
});
