import { describe, expect, it } from "vitest";
import { absentDays, AREAS, guessGender, progress, SKILLS, termFor, termRange } from "../sep";
import { sampleSep } from "../ai/client";

const year = { start: "2026-09-14", end: "2027-06-16" };

describe("ΣΕΠ", () => {
  it("has the 17 skills and the learning areas of the Ministry's form", () => {
    expect(SKILLS).toHaveLength(17);
    expect(AREAS.filter((a) => a.group === "greek")).toHaveLength(4);
    expect(AREAS.filter((a) => a.group === "maths")).toHaveLength(5);
  });
  it("splits the year into two τετράμηνα at the end of January", () => {
    expect(termRange(year, 1)).toEqual({ from: "2026-09-14", to: "2027-01-31" });
    expect(termRange(year, 2)).toEqual({ from: "2027-02-01", to: "2027-06-16" });
    expect(termFor(year, "2027-01-15")).toBe(1);
    expect(termFor(year, "2027-06-02")).toBe(2);
  });
  it("counts a pupil's absent days in a period from the class attendance", () => {
    const att = {
      "d1|2026-10-01": { absentIds: ["a"], recordedAt: 0 },
      "d1|2026-10-02": { absentIds: ["a", "b"], recordedAt: 0 },
      "d1|2027-02-03": { absentIds: ["a"], recordedAt: 0 },
      "d2|2026-10-02": { absentIds: ["a"], recordedAt: 0 },
    };
    expect(absentDays(att, "d1", "a", "2026-09-14", "2027-01-31")).toBe(2);
    expect(absentDays(att, "d1", "b", "2026-09-14", "2027-01-31")).toBe(1);
  });
  it("counts progress over the skills and the core areas", () => {
    const r = { studentId: "a", year: 2026, term: 1 as const, ratings: { focus: 3 as const, "gr-read": 4 as const }, texts: {}, reviewed: false, updatedAt: 0 };
    expect(progress(r, ["gr-read", "ma-num"])).toEqual({ done: 2, total: 19 });
  });
  it("guesses the gender for grammar from Greek first names", () => {
    expect(guessGender("Γιώργος")).toBe("m");
    expect(guessGender("Ανδρέας")).toBe("m");
    expect(guessGender("Μαρία")).toBe("f");
    expect(guessGender("Ελένη")).toBe("f");
  });
  it("demo drafts come from the ratings and never need a name", () => {
    const t = sampleSep({
      grade: "Δ΄",
      term: 1,
      gender: "f",
      ratings: [
        { label: "Κατανόηση γραπτού λόγου", value: "", stars: 4, group: "greek" },
        { label: "Παραγωγή γραπτού λόγου", value: "", stars: 2, group: "greek" },
        { label: "Δείχνει να του/της αρέσει το σχολείο", value: "", stars: 4, group: "skill" },
      ],
    });
    expect(t["greek.strengths"]).toContain("κατανόηση γραπτού λόγου");
    expect(t["greek.growth"]).toContain("παραγωγή γραπτού λόγου");
    expect(t.remarks).toContain("της αρέσει");
    expect(t["maths.strengths"]).toBeUndefined();
  });
});
