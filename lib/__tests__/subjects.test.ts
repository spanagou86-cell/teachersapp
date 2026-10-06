import { describe, expect, it } from "vitest";
import { CY_PERIODS, subjectChoices, subjectName, subjectsFor } from "../subjects";

describe("subjects", () => {
  it("uses each system's names for the same subject", () => {
    expect(subjectName("cy", "glossa")).toBe("Ελληνικά");
    expect(subjectName("gr", "glossa")).toBe("Γλώσσα");
    expect(subjectName("cy", "eikastika")).toBe("Τέχνη");
    expect(subjectName("cy", "zoi")).toBe("Αγωγή Ζωής");
  });

  it("keeps the other system's subjects for older lessons, out of the pickers", () => {
    const cy = subjectsFor("cy");
    expect(cy.find((s) => s.id === "meleti")).toMatchObject({ name: "Μελέτη Περιβάλλοντος", legacy: true });
    expect(subjectChoices(cy).some((s) => s.id === "meleti")).toBe(false);
    expect(subjectChoices(cy, "meleti").some((s) => s.id === "meleti")).toBe(true);
    expect(subjectChoices(subjectsFor("gr")).map((s) => s.id)).not.toContain("kpa");
    expect(new Set(cy.map((s) => s.id)).size).toBe(cy.length);
  });

  it("has the 35 weekly periods of every Cypriot grade", () => {
    for (let g = 0; g < 6; g++) expect(Object.values(CY_PERIODS).reduce((sum, p) => sum + p[g], 0)).toBe(35);
  });
});
