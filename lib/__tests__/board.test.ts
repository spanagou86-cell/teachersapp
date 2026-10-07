import { expect, test } from "vitest";
import { drawName, toSlides } from "../board";
import type { Block } from "../types";

const sheet: Block[] = [
  { id: "h", type: "heading", text: "Διαβάζω μια γραφική παράσταση" },
  { id: "t", type: "text", text: "Η γραφική παράσταση δείχνει φρούτα." },
  { id: "c", type: "chart", text: "", chart: { title: "Φρούτα", yLabel: "Μαθητές", bars: [{ label: "Μήλο", value: 8 }] } },
  { id: "e1", type: "exercise", text: "Ποιο φρούτο;", answer: "Μήλο" },
  { id: "e2", type: "exercise", text: "Πόσοι συνολικά;" },
];

test("a sheet becomes a title slide and one slide per exercise", () => {
  const s = toSlides("Γραφικές", sheet);
  expect(s.map((x) => x.kind)).toEqual(["title", "exercise", "exercise"]);
  expect(s[0]).toMatchObject({ title: "Διαβάζω μια γραφική παράσταση", body: ["Η γραφική παράσταση δείχνει φρούτα."] });
  expect(s[1]).toMatchObject({ n: 1, title: "Ποιο φρούτο;", answer: "Μήλο" });
  expect(s[2].chart?.title).toBe("Φρούτα");
});

test("a lesson plan becomes one slide per phase", () => {
  const plan: Block[] = [
    { id: "h", type: "heading", text: "Σχέδιο" },
    { id: "p1", type: "heading", text: "Αφόρμηση · 5′" },
    { id: "t1", type: "text", text: "Ερώτηση." },
    { id: "p2", type: "heading", text: "Κύρια δραστηριότητα · 20′" },
    { id: "t2", type: "text", text: "Ομάδες." },
  ];
  expect(toSlides("Σχέδιο", plan).map((x) => [x.kind, x.title, x.body.join()])).toEqual([
    ["title", "Σχέδιο", ""],
    ["section", "Αφόρμηση · 5′", "Ερώτηση."],
    ["section", "Κύρια δραστηριότητα · 20′", "Ομάδες."],
  ]);
});

test("everyone gets a turn before anyone twice", () => {
  let drawn = new Set<string>();
  const seen: string[] = [];
  for (let i = 0; i < 3; i++) {
    const r = drawName(["Α", "Β", "Γ"], drawn)!;
    seen.push(r.name);
    drawn = r.drawn;
  }
  expect(new Set(seen).size).toBe(3);
  expect(drawName(["Α", "Β", "Γ"], drawn)!.drawn.size).toBe(1);
});
