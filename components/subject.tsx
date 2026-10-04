import clsx from "clsx";
import { BookOpen, Calculator, FileImage, FileText, FileType2, Leaf, Palette } from "lucide-react";
import { fileKindLabel } from "@/lib/materials";
import type { FileMeta, SubjectId } from "@/lib/types";

export const SUBJECT_STYLE: Record<SubjectId, { bar: string; soft: string; text: string; Icon: typeof BookOpen }> = {
  glossa: { bar: "bg-glossa", soft: "bg-glossa-50", text: "text-glossa", Icon: BookOpen },
  math: { bar: "bg-math", soft: "bg-math-50", text: "text-amber", Icon: Calculator },
  meleti: { bar: "bg-meleti", soft: "bg-meleti-50", text: "text-meleti", Icon: Leaf },
  eikastika: { bar: "bg-eikastika", soft: "bg-eikastika-50", text: "text-eikastika", Icon: Palette },
};

export function SubjectIcon({ id, size = "md", className }: { id: SubjectId; size?: "sm" | "md" | "lg"; className?: string }) {
  const s = SUBJECT_STYLE[id];
  return (
    <span
      aria-hidden
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        s.soft,
        s.text,
        size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-10",
        className,
      )}
    >
      <s.Icon className={size === "lg" ? "size-6" : size === "sm" ? "size-4" : "size-5"} />
    </span>
  );
}

export function FileBadge({ file, className }: { file?: FileMeta; className?: string }) {
  const kind = file ? fileKindLabel(file.type, file.name) : "Αρχείο";
  const map = {
    PDF: { cls: "bg-danger-50 text-danger", Icon: FileType2 },
    Word: { cls: "bg-info-50 text-info", Icon: FileText },
    Εικόνα: { cls: "bg-brand-50 text-brand-500", Icon: FileImage },
    Αρχείο: { cls: "bg-line-2 text-ink-2", Icon: FileText },
  }[kind];
  return (
    <span aria-label={kind} className={clsx("inline-flex size-10 shrink-0 items-center justify-center rounded-xl", map.cls, className)}>
      <map.Icon className="size-5" />
    </span>
  );
}
