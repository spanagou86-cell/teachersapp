import { expect, test } from "vitest";
import { adaptMaterial, parseMore } from "@/lib/ai/mock";
import { buildBlocks } from "@/lib/ai/templates";
test("parse", () => {
  const cases: [string, number][] = [
    ["βάλε άλλη μια ερώτηση", 1], ["Βάλε άλλη μία ερώτηση", 1], ["πρόσθεσε 2 προβλήματα με ευρώ", 2], ["θέλω 10 ασκήσεις", 7],
    ["πρόσθεσε τρεις ασκήσεις", 3], ["άλλαξε την άσκηση 2", 0], ["βάλε λύσεις στην άσκηση 2", 0], ["κάνε πιο απλή την πρώτη άσκηση", 0],
    ["δύο ασκήσεις ακόμα", 2], ["βάλε κι άλλες ερωτήσεις", 1], ["πρόσθεσε μια άσκηση", 1],
  ];
  for (const [p, n] of cases) expect([p, parseMore(p, 3)]).toEqual([p, n]);
});
test("build & adapt", () => {
  for (const s of ["math", "glossa", "history", "art"] as const) for (const kind of ["worksheet", "quiz"] as const) {
    const b = buildBlocks({ subjectId: s, kind, level: "standard", grade: "Δ΄", hint: "", prefix: "z" } as never);
    const ex = b.filter((x) => x.type === "exercise");
    expect(ex.length).toBeGreaterThanOrEqual(5);
    expect(new Set(ex.map((x) => x.text)).size).toBe(ex.length);
    expect(new Set(b.map((x) => x.id)).size).toBe(b.length);
    const r = adaptMaterial({ blocks: b, actions: [], prompt: "βάλε άλλη μια ερώτηση" });
    expect(r.blocks.filter((x) => x.type === "exercise").length).toBe(ex.length + 1);
    expect(r.changedIds.length).toBe(1);
    const q = adaptMaterial({ blocks: r.blocks, actions: ["more"], prompt: "" });
    expect(q.blocks.filter((x) => x.type === "exercise").length).toBe(ex.length + 2);
  }
});
