import clsx from "clsx";
import { Atom, BookOpen, Calculator, Church, Dumbbell, FileImage, FileText, FileType2, Globe2, HeartHandshake, Landmark, Languages, Leaf, Monitor, Music, Palette, Puzzle, Seedling, Shapes, UsersGroup } from "@/components/icons";
import { fileKindLabel } from "@/lib/materials";
import type { FileMeta, SubjectId } from "@/lib/types";

export const SUBJECT_STYLE: Record<SubjectId, { bar: string; soft: string; text: string; border: string; Icon: typeof BookOpen }> = {
  glossa: { bar: "bg-glossa", soft: "bg-glossa-50", text: "text-glossa", border: "border-glossa", Icon: BookOpen },
  math: { bar: "bg-math", soft: "bg-math-50", text: "text-math", border: "border-math", Icon: Calculator },
  meleti: { bar: "bg-meleti", soft: "bg-meleti-50", text: "text-meleti", border: "border-meleti", Icon: Leaf },
  eikastika: { bar: "bg-eikastika", soft: "bg-eikastika-50", text: "text-eikastika", border: "border-eikastika", Icon: Palette },
  istoria: { bar: "bg-istoria", soft: "bg-istoria-50", text: "text-istoria", border: "border-istoria", Icon: Landmark },
  fysika: { bar: "bg-fysika", soft: "bg-fysika-50", text: "text-fysika", border: "border-fysika", Icon: Atom },
  geografia: { bar: "bg-geografia", soft: "bg-geografia-50", text: "text-geografia", border: "border-geografia", Icon: Globe2 },
  agglika: { bar: "bg-agglika", soft: "bg-agglika-50", text: "text-agglika", border: "border-agglika", Icon: Languages },
  thriskeftika: { bar: "bg-thriskeftika", soft: "bg-thriskeftika-50", text: "text-thriskeftika", border: "border-thriskeftika", Icon: Church },
  mousiki: { bar: "bg-mousiki", soft: "bg-mousiki-50", text: "text-mousiki", border: "border-mousiki", Icon: Music },
  fa: { bar: "bg-fa", soft: "bg-fa-50", text: "text-fa", border: "border-fa", Icon: Dumbbell },
  tpe: { bar: "bg-tpe", soft: "bg-tpe-50", text: "text-tpe", border: "border-tpe", Icon: Monitor },
  ergastiria: { bar: "bg-ergastiria", soft: "bg-ergastiria-50", text: "text-ergastiria", border: "border-ergastiria", Icon: Puzzle },
  zoi: { bar: "bg-zoi", soft: "bg-zoi-50", text: "text-zoi", border: "border-zoi", Icon: HeartHandshake },
  kpa: { bar: "bg-kpa", soft: "bg-kpa-50", text: "text-kpa", border: "border-kpa", Icon: UsersGroup },
  aeiforia: { bar: "bg-aeiforia", soft: "bg-aeiforia-50", text: "text-aeiforia", border: "border-aeiforia", Icon: Seedling },
  allo: { bar: "bg-allo", soft: "bg-allo-50", text: "text-allo", border: "border-allo", Icon: Shapes },
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
