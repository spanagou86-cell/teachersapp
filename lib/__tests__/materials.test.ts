import { describe, expect, it } from "vitest";
import { adaptMaterial, parsePrompt } from "../ai/mock";
import { buildBlocks } from "../ai/templates";
import { applyChange, exerciseNumber, restoreOriginal, restoreVersion } from "../materials";
import { seed } from "../seed";

const material = () => seed().materials[0];

describe("version history", () => {
  it("records each change and restores earlier versions without losing the original", () => {
    let m = material();
    const edited = m.blocks.map((b) => (b.type === "heading" ? { ...b, text: "Νέος τίτλος" } : b));
    m = applyChange(m, edited, "Αλλαγή τίτλου", "v2", 2);
    expect(m.versions.map((v) => v.label)).toEqual(["Αλλαγή τίτλου", "Δημιουργία από αρχείο"]);
    m = restoreVersion(m, "m1-v1", "v3", 3);
    expect(m.blocks[0].text).toBe("Διαβάζω μια γραφική παράσταση");
    expect(m.versions).toHaveLength(3);
    m = restoreOriginal(applyChange(m, [], "Άδειασμα", "v4", 4), "v5", 5);
    expect(m.blocks).toEqual(m.originalBlocks);
  });
});

describe("demo AI", () => {
  it("understands which exercise the prompt refers to", () => {
    expect(parsePrompt("Άλλαξε μόνο τη δεύτερη άσκηση, πιο απλά")).toEqual({ actions: ["simpler"], exercise: 2 });
    expect(parsePrompt("άσκηση 3 πιο δύσκολη").exercise).toBe(3);
  });

  it("simplifies only the targeted exercise", () => {
    const blocks = material().blocks;
    const r = adaptMaterial({ blocks, actions: [], prompt: "Κάνε τη δεύτερη άσκηση πιο απλή" });
    expect(r.changedIds).toHaveLength(1);
    expect(exerciseNumber(blocks, r.changedIds[0])).toBe(2);
    expect(r.blocks.find((b) => b.id === r.changedIds[0])?.level).toBe("basic");
    expect(blocks.find((b) => b.id === r.changedIds[0])?.level).toBe("standard");
  });

  it("produces a version B with different data", () => {
    const blocks = material().blocks;
    const r = adaptMaterial({ blocks, actions: ["versionAB"], prompt: "" });
    expect(r.versionB).toBeDefined();
    expect(r.versionB!.filter((b, i) => b.text !== blocks[i].text).length).toBeGreaterThan(0);
  });

  it("adjusts hand-written exercises that have no variants", () => {
    const r = adaptMaterial({ blocks: [{ id: "x", type: "exercise", text: "Λύσε το 3 + 4" }], actions: ["harder"], prompt: "" });
    expect(r.blocks[0].text).toContain("Εξήγησε πώς σκέφτηκες.");
  });

  it("flags prompts it could not interpret", () => {
    const r = adaptMaterial({ blocks: material().blocks, actions: [], prompt: "βάλε θέμα με δεινόσαυρους" });
    expect(r.partial).toBe(true);
  });

  it("builds every subject and kind", () => {
    for (const subjectId of ["glossa", "math", "meleti", "eikastika"] as const)
      for (const kind of ["worksheet", "plan", "quiz", "summary"] as const)
        expect(buildBlocks({ subjectId, kind, level: "advanced", grade: "Δ΄", hint: "", prefix: "p" }).length).toBeGreaterThan(1);
  });
});
