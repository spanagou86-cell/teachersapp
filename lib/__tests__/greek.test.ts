import { describe, expect, it } from "vitest";
import { vocative } from "../greek";

describe("vocative", () => {
  it("forms the vocative of common first names", () => {
    expect(vocative("Σπύρος")).toBe("Σπύρο");
    expect(vocative("Γιώργος")).toBe("Γιώργο");
    expect(vocative("Αλέξανδρος")).toBe("Αλέξανδρε");
    expect(vocative("Δημήτρης")).toBe("Δημήτρη");
    expect(vocative("Ανδρέας")).toBe("Ανδρέα");
    expect(vocative("Μαρία")).toBe("Μαρία");
    expect(vocative("Ελένη")).toBe("Ελένη");
  });
});
