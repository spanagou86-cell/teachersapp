import { describe, expect, it } from "vitest";
import { dutyLabel, holidayOn, isSchoolDay, orthodoxEaster, schoolYear, termOn, weekNumber } from "../schoolYear";

describe("school year", () => {
  it("computes Orthodox Easter", () => {
    expect(orthodoxEaster(2026)).toBe("2026-04-12");
    expect(orthodoxEaster(2027)).toBe("2027-05-02");
    expect(orthodoxEaster(2028)).toBe("2028-04-16");
  });

  it("knows Greek holidays and terms for 2026–27", () => {
    expect(holidayOn("gr", "2026-10-28")).toBe("28η Οκτωβρίου");
    expect(holidayOn("gr", "2027-03-15")).toBe("Καθαρά Δευτέρα");
    expect(holidayOn("gr", "2027-05-04")).toBe("Διακοπές Πάσχα");
    expect(holidayOn("gr", "2027-06-21")).toBe("Αγίου Πνεύματος");
    expect(holidayOn("gr", "2026-10-01")).toBeUndefined();
    expect(termOn("gr", "2026-10-05")).toBe("Α΄ τρίμηνο");
    expect(termOn("gr", "2027-02-10")).toBe("Β΄ τρίμηνο");
  });

  it("knows Cypriot holidays and wording", () => {
    expect(holidayOn("cy", "2026-10-01")).toBe("Ημέρα Ανεξαρτησίας");
    expect(holidayOn("cy", "2027-04-01")).toBe("1η Απριλίου");
    expect(holidayOn("cy", "2027-06-21")).toBe("Κατακλυσμός");
    expect(dutyLabel("cy")).toBe("Παιδονομία");
    expect(dutyLabel("gr")).toBe("Εφημερία");
  });

  it("numbers school weeks from the first school day", () => {
    expect(schoolYear("gr", 2026).start).toBe("2026-09-11");
    expect(weekNumber("gr", "2026-09-11")).toBe(1);
    expect(weekNumber("gr", "2026-10-05")).toBe(5);
    expect(weekNumber("gr", "2026-10-30")).toBe(8);
    expect(weekNumber("gr", "2026-08-20")).toBeUndefined();
  });

  it("tells school days apart", () => {
    expect(isSchoolDay("gr", "2026-10-05")).toBe(true);
    expect(isSchoolDay("gr", "2026-10-28")).toBe(false);
    expect(isSchoolDay("gr", "2026-10-04")).toBe(false);
  });
});
