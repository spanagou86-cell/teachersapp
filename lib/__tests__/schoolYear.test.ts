import { afterEach, describe, expect, it } from "vitest";
import { dutyLabel, holidayOn, isSchoolDay, orthodoxEaster, schoolYear, setLocalHoliday, termOn, weekNumber } from "../schoolYear";

const days = (country: "gr" | "cy", y: number) => schoolYear(country, y).holidays.map((h) => (h.from === h.to ? h.from : `${h.from}…${h.to}`));

describe("school year", () => {
  afterEach(() => setLocalHoliday(undefined));

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

  // moec.gov.cy/dde/scholikes_argies.html — «Σχολικές αργίες για τη σχολική χρονιά 2026-2027»
  it("matches the Ministry's official Cyprus calendar for 2026–27", () => {
    const y = schoolYear("cy", 2026);
    expect(y.start).toBe("2026-09-14");
    expect(y.end).toBe("2027-06-16");
    expect(days("cy", 2026)).toEqual([
      "2026-10-01",
      "2026-10-28",
      "2026-12-23…2027-01-06",
      "2027-03-15",
      "2027-03-25",
      "2027-04-01",
      "2027-04-26…2027-05-07",
      "2027-06-10",
      "2027-06-11",
    ]);
    expect(holidayOn("cy", "2027-06-10")).toBe("Αναλήψεως");
    expect(holidayOn("cy", "2027-06-11")).toBe("Αποστόλου Βαρνάβα");
    expect(isSchoolDay("cy", "2027-01-07")).toBe(true);
    expect(isSchoolDay("cy", "2027-06-17")).toBe(false);
    expect(isSchoolDay("cy", "2026-09-11")).toBe(false);
  });

  // The same page, «Σχολικές αργίες για τη σχολική χρονιά 2025-2026».
  it("matches the official Cyprus list for 2025–26", () => {
    expect(schoolYear("cy", 2025).end).toBe("2026-06-17");
    expect(days("cy", 2025)).toEqual([
      "2025-10-01",
      "2025-10-28",
      "2025-12-23…2026-01-06",
      "2026-01-30",
      "2026-02-23",
      "2026-03-25",
      "2026-04-01",
      "2026-04-06…2026-04-17",
      "2026-04-23",
      "2026-05-01",
      "2026-05-21",
      "2026-06-01",
      "2026-06-11",
    ]);
    expect(holidayOn("cy", "2026-04-23")).toBe("Ονομαστήρια Αρχιεπισκόπου");
  });

  it("plans the Cypriot year in three parts around the long breaks", () => {
    expect(termOn("cy", "2026-12-22")).toBe("Α΄ τρίμηνο");
    expect(termOn("cy", "2027-01-07")).toBe("Β΄ τρίμηνο");
    expect(termOn("cy", "2027-04-23")).toBe("Β΄ τρίμηνο");
    expect(termOn("cy", "2027-05-10")).toBe("Γ΄ τρίμηνο");
    expect(termOn("cy", "2027-06-16")).toBe("Γ΄ τρίμηνο");
  });

  it("adds the school's own feast day when it falls on a school day", () => {
    setLocalHoliday("12-06");
    expect(holidayOn("cy", "2026-12-04")).toBeUndefined();
    expect(holidayOn("cy", "2027-12-06")).toBe("Τοπική γιορτή");
    expect(isSchoolDay("cy", "2027-12-06")).toBe(false);
    // 2026: a Sunday, nothing changes.
    expect(days("cy", 2026)).toHaveLength(9);
    setLocalHoliday("02-09");
    expect(holidayOn("gr", "2027-02-09")).toBe("Τοπική γιορτή");
    setLocalHoliday("12-25");
    expect(days("cy", 2026)).toHaveLength(9);
    setLocalHoliday("nonsense");
    expect(holidayOn("gr", "2027-02-09")).toBeUndefined();
  });

  it("uses each country's wording", () => {
    expect(holidayOn("cy", "2026-10-01")).toBe("Ημέρα Ανεξαρτησίας");
    expect(holidayOn("cy", "2027-04-01")).toBe("1η Απριλίου");
    expect(dutyLabel("cy")).toBe("Παιδονομία");
    expect(dutyLabel("gr")).toBe("Εφημερία");
  });

  it("numbers school weeks from the first school day", () => {
    expect(schoolYear("gr", 2026).start).toBe("2026-09-11");
    expect(weekNumber("gr", "2026-09-11")).toBe(1);
    expect(weekNumber("gr", "2026-10-05")).toBe(5);
    expect(weekNumber("gr", "2026-10-30")).toBe(8);
    expect(weekNumber("gr", "2026-08-20")).toBeUndefined();
    expect(weekNumber("cy", "2026-09-14")).toBe(1);
    expect(weekNumber("cy", "2026-10-05")).toBe(4);
  });

  it("tells school days apart", () => {
    expect(isSchoolDay("gr", "2026-10-05")).toBe(true);
    expect(isSchoolDay("gr", "2026-10-28")).toBe(false);
    expect(isSchoolDay("gr", "2026-10-04")).toBe(false);
  });
});
