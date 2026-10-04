"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { uid } from "@/lib/id";
import { useApp } from "@/lib/store";
import { saveBlob } from "@/lib/store/blobs";
import { remote } from "@/lib/store/remote";
import { usePendingUpload } from "@/lib/store/pending";
import type { FileMeta } from "@/lib/types";
import { toast } from "./toast";

export const ACCEPT = ".pdf,.doc,.docx,.odt,image/*";
const MAX_BYTES = 25 * 1024 * 1024;

export async function ingestFile(file: File): Promise<{ meta: FileMeta; previewUrl: string } | { error: string }> {
  const ok = /\.(pdf|docx?|odt)$/i.test(file.name) || file.type.startsWith("image/") || file.type === "application/pdf";
  if (!ok) return { error: "Υποστηρίζονται PDF, Word και εικόνες." };
  if (file.size > MAX_BYTES) return { error: "Το αρχείο ξεπερνά τα 25 MB." };
  const { mode, userId } = useApp.getState();
  const previewUrl = URL.createObjectURL(file);
  if (mode === "cloud" && userId) {
    try {
      const path = await remote.uploadFile(userId, file);
      return { meta: { name: file.name, size: file.size, type: file.type, path }, previewUrl };
    } catch {
      return { error: "Το αρχείο δεν ανέβηκε. Έλεγξε τη σύνδεση και δοκίμασε ξανά." };
    }
  }
  const blobKey = uid();
  const stored = await saveBlob(blobKey, file);
  return { meta: { name: file.name, size: file.size, type: file.type, blobKey: stored ? blobKey : undefined }, previewUrl };
}

/** Opens the file picker and hands the chosen file to the material wizard. */
export function UploadTrigger({
  children,
  className,
  camera,
  slotId,
}: {
  children: ReactNode;
  className?: string;
  camera?: boolean;
  slotId?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const setPending = usePendingUpload((s) => s.set);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" className={clsx(className, busy && "opacity-60")} disabled={busy} onClick={() => ref.current?.click()}>
        {children}
      </button>
      <input
        ref={ref}
        type="file"
        hidden
        accept={camera ? "image/*" : ACCEPT}
        capture={camera ? "environment" : undefined}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          const r = await ingestFile(file);
          setBusy(false);
          if ("error" in r) return toast(r.error);
          setPending(r.meta, r.previewUrl);
          router.push(`/materials/new${slotId ? `?slot=${slotId}` : ""}`);
        }}
      />
    </>
  );
}
