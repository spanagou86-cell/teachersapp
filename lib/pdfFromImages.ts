"use client";

/** Several phone photos of a booklet → one A4 PDF, a page per photo, in the order picked. */
export async function pdfFromImages(images: Blob[], title: string): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  const A4 = { w: 595.28, h: 841.89 };
  const margin = 18;
  for (const img of images) {
    const bytes = new Uint8Array(await img.arrayBuffer());
    const embedded = img.type === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    // Landscape photos get a landscape page.
    const landscape = embedded.width > embedded.height;
    const pw = landscape ? A4.h : A4.w;
    const ph = landscape ? A4.w : A4.h;
    const scale = Math.min((pw - margin * 2) / embedded.width, (ph - margin * 2) / embedded.height);
    const w = embedded.width * scale;
    const h = embedded.height * scale;
    const page = pdf.addPage([pw, ph]);
    page.drawImage(embedded, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
  }
  const out = await pdf.save();
  return new Blob([out.slice().buffer as ArrayBuffer], { type: "application/pdf" });
}
