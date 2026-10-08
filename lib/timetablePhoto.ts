"use client";

import { create } from "zustand";
import { aiReadTimetable, shrinkImage, toBase64, type ReadEntry } from "./ai/client";

/** What a photo of the timetable gave, waiting on the timetable page for the teacher to check and save. */
export const useTimetableDraft = create<{ draft?: { entries: ReadEntry[]; notes?: string }; set: (d?: { entries: ReadEntry[]; notes?: string }) => void }>((set) => ({
  draft: undefined,
  set: (draft) => set({ draft }),
}));

/** A photo or PDF of the school timetable → the teacher's own hours. */
export async function readTimetablePhoto(
  file: File,
  { teacher, classes, country }: { teacher: string; classes: string[]; country: "gr" | "cy" },
): Promise<{ ok: true; entries: ReadEntry[]; notes?: string } | { ok: false; error: string }> {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!isPdf && !/^image\/(jpeg|png|webp|gif)$/.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))
    return { ok: false, error: "Ανέβασε φωτογραφία (JPG/PNG) ή PDF του προγράμματος." };
  const blob = isPdf ? file : await shrinkImage(file, 1800, 0.85);
  if (blob.size > 3_000_000) return { ok: false, error: "Το αρχείο είναι μεγάλο. Δοκίμασε φωτογραφία ή PDF μιας σελίδας." };
  const mediaType = isPdf ? "application/pdf" : blob.type === "image/jpeg" || blob.type === "image/png" || blob.type === "image/webp" ? blob.type : "";
  if (!mediaType) return { ok: false, error: "Αυτή η φωτογραφία δεν διαβάζεται. Τράβηξέ τη ξανά από την κάμερα ή στείλε τη ως JPG." };
  const r = await aiReadTimetable({ data: await toBase64(blob), mediaType }, teacher, classes, country);
  if (!r.ok) return r;
  return { ok: true, entries: r.data.entries, notes: r.data.notes };
}
