import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { pdfFromImages } from "../pdfFromImages";

// 2×1 and 1×2 pixel PNGs: a landscape and a portrait "photo".
const png = (b64: string) => new Blob([Buffer.from(b64, "base64")], { type: "image/png" });
const WIDE = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR42mP8z8DwnwEIGAEAJvQD/qnYqJcAAAAASUVORK5CYII=";
const TALL = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEUlEQVR42mP8z8DwnwEIGAEAJvQD/qnYqJcAAAAASUVORK5CYII=";

describe("pdfFromImages", () => {
  it("makes one A4 page per photo, landscape photos on landscape pages", async () => {
    const blob = await pdfFromImages([png(TALL), png(WIDE)], "Φυλλάδιο κλασμάτων");
    expect(blob.type).toBe("application/pdf");
    const doc = await PDFDocument.load(new Uint8Array(await blob.arrayBuffer()));
    expect(doc.getPageCount()).toBe(2);
    const [p1, p2] = doc.getPages();
    expect(p1.getHeight()).toBeGreaterThan(p1.getWidth());
    expect(p2.getWidth()).toBeGreaterThan(p2.getHeight());
  });
});
