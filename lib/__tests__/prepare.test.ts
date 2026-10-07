import { describe, expect, it } from "vitest";
import { inferKind, prepRequest, previousTopic, upcoming, whenLabel } from "../prepare";
import type { LessonSlot } from "../types";

const slot = (id: string, date: string, start: string, end: string, topic = "", subjectId: LessonSlot["subjectId"] = "math"): LessonSlot => ({
  id,
  date,
  start,
  end,
  classId: "d1",
  subjectId,
  topic,
  materialIds: [],
  status: "planned",
  taughtNote: "",
});

describe("prepare", () => {
  const slots = [
    slot("a", "2026-10-05", "08:25", "09:05", "Κλάσματα"),
    slot("b", "2026-10-05", "10:05", "10:45"),
    slot("c", "2026-10-06", "07:45", "08:25", "Δεκαδικοί"),
    slot("d", "2026-10-02", "08:25", "09:05", "Ισοδύναμα κλάσματα"),
  ];

  it("starts from the current lesson, then the next ones", () => {
    expect(upcoming(slots, "2026-10-05", "08:40").map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(upcoming(slots, "2026-10-05", "09:10").map((s) => s.id)).toEqual(["b", "c"]);
  });

  it("says when, in words", () => {
    expect(whenLabel(slots[1], "2026-10-05")).toBe("Σήμερα 10:05");
    expect(whenLabel(slots[2], "2026-10-05")).toBe("Αύριο 07:45");
    expect(whenLabel(slot("x", "2026-10-08", "09:25", "10:05"), "2026-10-05")).toBe("Πέμπτη 09:25");
  });

  it("follows on from the previous lesson of the same class and subject", () => {
    expect(previousTopic(slots, slots[1])).toBe("Κλάσματα");
    expect(previousTopic(slots, slots[0])).toBe("Ισοδύναμα κλάσματα");
    expect(previousTopic(slots, { ...slots[1], subjectId: "glossa" })).toBeUndefined();
  });

  it("reads the kind from free text", () => {
    expect(inferKind("Ένα τεστ για τα κλάσματα")).toBe("quiz");
    expect(inferKind("σχέδιο μαθήματος με ομαδική δουλειά")).toBe("plan");
    expect(inferKind("φύλλο σε τρία επίπεδα")).toBe("levels");
    expect(inferKind("υπαγόρευση με λέξεις σε -ώνω")).toBe("spelling");
    expect(inferKind("κατανόηση κειμένου για τα ζώα")).toBe("reading");
    expect(inferKind("προβλήματα με ευρώ")).toBe("problems");
    expect(inferKind("ασκήσεις για τα κλάσματα")).toBe("worksheet");
  });

  it("asks for the lesson's topic, never for anything about pupils", () => {
    const r = prepRequest({ kind: "quiz", subject: "Μαθηματικά", grade: "Δ΄ Δημοτικού", topic: "Κλάσματα", text: "πιο εύκολο" });
    expect(r.title).toBe("Κλάσματα · Τεστ 10′");
    expect(r.hint).toContain("Θέμα του μαθήματος: Κλάσματα.");
    expect(r.hint).toContain("πιο εύκολο");
    const none = prepRequest({ kind: "worksheet", subject: "Ελληνικά", grade: "Δ΄ Δημοτικού", topic: "", previous: "Ρήματα σε -ίζω" });
    expect(none.title).toBe("Ελληνικά · Δ΄ · Φύλλο εργασίας");
    expect(none.hint).toContain("«Ρήματα σε -ίζω»");
    expect(prepRequest({ kind: "worksheet", subject: "Μαθηματικά", grade: "", topic: "Κλάσματα" }).title).toBe("Κλάσματα");
    expect(prepRequest({ kind: "levels", subject: "Μαθηματικά", grade: "", topic: "Κλάσματα" }).title).toBe("Κλάσματα");
  });
});
