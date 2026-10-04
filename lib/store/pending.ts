"use client";

import { create } from "zustand";
import type { FileMeta } from "../types";

/** A file the teacher just picked, handed from any upload button to the wizard. Not persisted. */
export const usePendingUpload = create<{ file?: FileMeta; previewUrl?: string; set: (f?: FileMeta, previewUrl?: string) => void }>((set) => ({
  set: (file, previewUrl) => set({ file, previewUrl }),
}));
