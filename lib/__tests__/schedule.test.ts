import { periodsFrom } from "../timetable";
import { describe, expect, it } from "vitest";
import { carryOverLesson, findConflicts, freePeriods, nextLesson, undoCarryOver } from "../schedule";
import { seed } from "../seed";
import type { LessonSlot } from "../types";

const slot = (id: string, date: string, start: string, end: string, extra: Partial<LessonSlot> = {}): LessonSlot => ({
  id, date, start, end, classId: "d1", subjectId: "math", topic: "Τ", materialIds: [], status: "planned", taughtNote: "", ...extra,
});

describe("findConflicts", () => {
  const slots = [slot("a", "2026-10-06", "09:20", "10:00")];
  it("detects overlap on the same day", () => {
    expect(findConflicts(slots, { date: "2026-10-06", start: "09:40", end: "10:20" })).toHaveLength(1);
  });
  it("treats back-to-back lessons as free", () => {
    expect(findConflicts(slots, { date: "2026-10-06", start: "10:00", end: "10:40" })).toHaveLength(0);
  });
  it("ignores other days and the lesson itself", () => {
    expect(findConflicts(slots, { date: "2026-10-07", start: "09:20", end: "10:00" })).toHaveLength(0);
    expect(findConflicts(slots, { date: "2026-10-06", start: "09:20", end: "10:00" }, "a")).toHaveLength(0);
  });
});

describe("carryOverLesson", () => {
  const base = [
    slot("orig", "2026-10-05", "09:20", "10:00", { status: "partial", materialIds: ["m1"], taughtNote: "Μέχρι την άσκηση 2" }),
    slot("busy", "2026-10-06", "09:20", "10:00"),
  ];

  it("rejects a taken period and reports the conflict", () => {
    const r = carryOverLesson(base, "orig", { date: "2026-10-06", start: "09:20", end: "10:00" }, "new", "2026-10-05");
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === "conflict") expect(r.conflicts.map((c) => c.id)).toEqual(["busy"]);
  });

  it("rejects dates in the past", () => {
    const r = carryOverLesson(base, "orig", { date: "2026-10-02", start: "08:00", end: "08:40" }, "new", "2026-10-05");
    expect(r).toEqual({ ok: false, reason: "past" });
  });

  it("creates a linked lesson that keeps the material and leaves history intact", () => {
    const r = carryOverLesson(base, "orig", { date: "2026-10-06", start: "11:00", end: "11:40" }, "new", "2026-10-05");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.newSlot).toMatchObject({ carriedFromId: "orig", materialIds: ["m1"], status: "planned", taughtNote: "" });
    const orig = r.slots.find((s) => s.id === "orig")!;
    expect(orig).toMatchObject({ carriedToId: "new", status: "partial", taughtNote: "Μέχρι την άσκηση 2" });
    expect(carryOverLesson(r.slots, "orig", { date: "2026-10-07", start: "11:00", end: "11:40" }, "x", "2026-10-05")).toEqual({ ok: false, reason: "already-carried" });
  });

  it("marks a lesson that hadn't been logged as partial", () => {
    const r = carryOverLesson([slot("p", "2026-10-05", "08:00", "08:40")], "p", { date: "2026-10-06", start: "08:00", end: "08:40" }, "n", "2026-10-05");
    expect(r.ok && r.slots.find((s) => s.id === "p")?.status).toBe("partial");
  });

  it("can be undone", () => {
    const r = carryOverLesson(base, "orig", { date: "2026-10-06", start: "11:00", end: "11:40" }, "new", "2026-10-05");
    if (!r.ok) throw new Error("expected ok");
    const back = undoCarryOver(r.slots, "new");
    expect(back.find((s) => s.id === "new")).toBeUndefined();
    expect(back.find((s) => s.id === "orig")?.carriedToId).toBeUndefined();
  });
});

describe("seed schedule", () => {
  const { slots } = seed();
  it("matches the mockup Monday", () => {
    const monday = slots.filter((s) => s.date === "2026-10-05");
    expect(monday.map((s) => `${s.start} ${s.subjectId} ${s.topic}`)).toEqual([
      "07:45 glossa Επαναληπτικές ασκήσεις – Ορθογραφία",
      "09:25 math Γραφικές παραστάσεις",
      "10:05 fysika Το νερό στον τόπο μας",
      "11:35 eikastika Δημιουργία αφίσας – Ομαδική εργασία",
    ]);
  });
  it("has unique ids and no overlaps", () => {
    expect(new Set(slots.map((s) => s.id)).size).toBe(slots.length);
    for (const s of slots) expect(findConflicts(slots, s, s.id)).toHaveLength(0);
  });
  it("finds the next lesson and free periods", () => {
    expect(nextLesson(slots, "2026-10-05", "09:05")?.subjectId).toBe("math");
    // The demo is a Cypriot school: free periods come from the Cyprus bell.
    expect(freePeriods(slots, "2026-10-06", periodsFrom([], "cy")).map((p) => p.start)).toEqual(["08:25", "10:05", "11:35"]);
  });
});
