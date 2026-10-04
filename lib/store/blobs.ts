"use client";

import { del, get, set } from "idb-keyval";

/** Uploaded files live in IndexedDB so they survive a refresh without a backend. */
export async function saveBlob(key: string, file: Blob): Promise<boolean> {
  try {
    await set(key, file);
    return true;
  } catch {
    return false;
  }
}

export async function loadBlob(key: string): Promise<Blob | undefined> {
  try {
    return await get<Blob>(key);
  } catch {
    return undefined;
  }
}

export async function deleteBlob(key: string): Promise<void> {
  try {
    await del(key);
  } catch {
    // Storage may be unavailable (private mode); nothing to clean up then.
  }
}
