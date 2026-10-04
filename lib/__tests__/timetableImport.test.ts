import { describe, expect, it } from "vitest";
import { gradeFromName, matchSubject, normClass, planImport } from "../ai/timetableImport";
import type { ClassGroup } from "../types";

const classes: ClassGroup[] = [{ id: "c1", name: "Δ1", grade: "Δ΄ Δημοτικού", room: "" }];

describe("timetable import", () => {
  it("matches class names written in different ways", () => {
    expect(normClass("Δ΄1")).toBe(normClass("δ1"));
    expect(normClass("Ε 2")).toBe(normClass("E2")); // Latin E
  });
  it("recognises subjects", () => {
    expect(matchSubject("Νεοελληνική Γλώσσα")).toBe("glossa");
    expect(matchSubject("Φυσική Αγωγή")).toBe("fa");
    expect(matchSubject("Φυσικά")).toBe("fysika");
    expect(matchSubject("Μελέτη Περιβάλλοντος")).toBe("meleti");
    expect(matchSubject("Ευέλικτη ζώνη")).toBe("allo");
  });
  it("guesses the grade from the class name", () => {
    expect(gradeFromName("ΣΤ2")).toBe("ΣΤ΄ Δημοτικού");
    expect(gradeFromName("Β1")).toBe("Β΄ Δημοτικού");
  });
  it("builds rows, cells and the list of new classes", () => {
    const plan = planImport(
      [
        { weekday: 1, start: "09:00", end: "09:45", kind: "lesson", className: "Δ΄1", subject: "Μαθηματικά" },
        { weekday: 1, start: "08:15", end: "09:00", kind: "lesson", className: "Ε2", subject: "Ευέλικτη ζώνη" },
        { weekday: 2, start: "09:45", end: "10:05", kind: "duty", label: "Αυλή" },
        { weekday: 2, start: "09:45", end: "10:05", kind: "free" },
      ],
      classes,
    );
    expect(plan.periods.map((p) => p.start)).toEqual(["08:15", "09:00", "09:45"]);
    expect(plan.newClasses).toEqual(["Ε2"]);
    expect(plan.cells).toHaveLength(3);
    expect(plan.cells.find((c) => c.start === "09:00")?.classId).toBe("c1");
    expect(plan.cells.find((c) => c.start === "08:15")?.label).toBe("Ευέλικτη ζώνη");
  });
});
