import { expect, test } from "vitest";
import { nextCheck, nextOfSame, pupilBySubject, tally } from "../checks";
import type { LessonSlot } from "../types";

const slot = (id: string, date: string, start: string, subjectId: LessonSlot["subjectId"], checks?: LessonSlot["checks"]): LessonSlot => ({
  id, date, start, end: start, classId: "d1", subjectId, topic: "", materialIds: [], status: "planned", taughtNote: "", checks,
});

test("cycle, tally, per pupil, next lesson", () => {
  expect([nextCheck(undefined), nextCheck("y"), nextCheck("p"), nextCheck("n")]).toEqual(["y", "p", "n", undefined]);
  expect(tally({ a: "y", b: "n", c: "y" })).toEqual({ y: 2, p: 0, n: 1 });
  const slots = [slot("1", "2026-10-05", "09:25", "math", { a: "n" }), slot("2", "2026-10-06", "07:45", "math", { a: "y" }), slot("3", "2026-10-06", "09:25", "glossa", { a: "p" })];
  expect(pupilBySubject(slots, "a")).toEqual({ math: { y: 1, p: 0, n: 1 }, glossa: { y: 0, p: 1, n: 0 } });
  expect(nextOfSame(slots, slots[0])?.id).toBe("2");
});
