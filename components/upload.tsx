"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { uid } from "@/lib/id";
import { useApp } from "@/lib/store";
import { saveBlob } from "@/lib/store/blobs";
import { remote } from "@/lib/store/remote";
import { guessSubject, titleFromFileName } from "@/lib/materials";
import type { FileMeta } from "@/lib/types";
import { toast } from "./toast";
import { shrinkImage } from "@/lib/ai/client";

export const ACCEPT = ".pdf,.doc,.docx,.odt,.jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic";
const MAX_BYTES = 25 * 1024 * 1024;

/** Some phones and Windows report no type for Word files; derive it from the name. */
const BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  odt: "application/vnd.oasis.opendocument.text",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

export async function ingestFile(original: File): Promise<{ meta: FileMeta; previewUrl: string } | { error: string }> {
  const ext = original.name.split(".").pop()?.toLowerCase() ?? "";
  const type = original.type && Object.values(BY_EXT).includes(original.type) ? original.type : BY_EXT[ext];
  if (!type) return { error: "Υποστηρίζονται PDF, Word (.docx) και φωτογραφίες (JPG, PNG)." };
  // Phone photos are shrunk: faster upload, and the AI reads them quicker and cheaper.
  const shrunk = await shrinkImage(new Blob([original], { type }));
  const file =
    shrunk.size < original.size
      ? new File([shrunk], original.name.replace(/\.(heic|heif|png|webp|jpe?g)$/i, "") + ".jpg", { type: "image/jpeg" })
      : new File([original], original.name, { type });
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

/**
 * Opens the file picker and files the upload as it is: in the library, and in the lesson when
 * there is one. Making a worksheet from it is a choice the teacher makes afterwards.
 */
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
        accept={camera ? "image/jpeg,image/png,image/webp,image/heic" : ACCEPT}
        capture={camera ? "environment" : undefined}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const { slots, classes, createMaterial, attachMaterial } = useApp.getState();
          const slot = slotId ? slots.find((s) => s.id === slotId) : undefined;
          const classId = slot?.classId ?? classes[0]?.id;
          if (!classId) return toast("Πρόσθεσε πρώτα ένα τμήμα από τις «Τάξεις».");
          setBusy(true);
          const r = await ingestFile(file);
          setBusy(false);
          if ("error" in r) return toast(r.error);
          const id = createMaterial({
            title: titleFromFileName(file.name),
            classId,
            subjectId: slot?.subjectId ?? guessSubject(file.name) ?? "allo",
            kind: "file",
            level: "standard",
            withSolutions: false,
            file: r.meta,
            blocks: [],
          });
          if (slot) attachMaterial(slot.id, id);
          toast(slot ? "Το αρχείο ανέβηκε και μπήκε στο μάθημα" : "Το αρχείο ανέβηκε");
          router.push(`/materials/${id}`);
        }}
      />
    </>
  );
}
