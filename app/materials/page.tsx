"use client";

import clsx from "clsx";
import { CloudUpload, FolderOpen, Paperclip, Search, Sparkles, Trash2 } from "@/components/icons";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MobileBrandBar, PageHeader } from "@/components/shell/PageHeader";
import { FileBadge, SubjectIcon } from "@/components/subject";
import { toast } from "@/components/toast";
import { Button, Card, EmptyState, inputClass, Select } from "@/components/ui";
import { openPrepare } from "@/components/prepare";
import { UploadTrigger } from "@/components/upload";
import { relativeTime } from "@/lib/dates";
import { fileKindLabel, formatBytes, KIND_LABEL } from "@/lib/materials";
import { useApp } from "@/lib/store";
import { useSubjects } from "@/lib/store/hooks";
import type { SubjectId } from "@/lib/types";

export default function MaterialsPage() {
  const materials = useApp((s) => s.materials);
  const subjects = useSubjects();
  const classes = useApp((s) => s.classes);
  const slots = useApp((s) => s.slots);
  const del = useApp((s) => s.deleteMaterial);
  const [subject, setSubject] = useState<SubjectId | "all">("all");
  const [classId, setClassId] = useState("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...materials]
      .filter((m) => (subject === "all" || m.subjectId === subject) && (classId === "all" || m.classId === classId))
      .filter((m) => !term || m.title.toLowerCase().includes(term))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [materials, subject, classId, q]);

  return (
    <div>
      <MobileBrandBar />
      <PageHeader
        title="Υλικό & αρχεία"
        subtitle={`${materials.length} ${materials.length === 1 ? "αρχείο" : "αρχεία"} οργανωμένα ανά τμήμα και μάθημα`}
        actions={
          <>
            <UploadTrigger className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold hover:bg-line-2 sm:flex-none">
              <CloudUpload className="size-4" /> Ανέβασμα
            </UploadTrigger>
            <Button onClick={() => openPrepare({ slotId: null })} className="flex-1 sm:flex-none">
              <Sparkles className="size-4" /> Νέο υλικό
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Αναζήτηση υλικού…" aria-label="Αναζήτηση υλικού" className={clsx(inputClass, "h-10 pl-9")} />
        </div>
        <Select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Τμήμα" className="sm:w-44">
          <option value="all">Όλα τα τμήματα</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.grade}
            </option>
          ))}
        </Select>
      </div>
      <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {[{ id: "all" as const, name: "Όλα" }, ...subjects.filter((s) => s.id === subject || materials.some((m) => m.subjectId === s.id))].map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={subject === s.id}
            onClick={() => setSubject(s.id)}
            className={clsx(
              "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold",
              subject === s.id ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-2 hover:bg-line-2",
            )}
          >
            {s.name}
          </button>
        ))}
      </div>

      <Card>
        {list.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="size-6" />}
            title={materials.length ? "Δεν βρέθηκε υλικό" : "Η βιβλιοθήκη σου είναι άδεια"}
            text={materials.length ? "Δοκίμασε άλλη λέξη ή άλλο μάθημα." : "Φτιάξε το πρώτο σου φύλλο με AI ή ανέβασε ένα PDF, Word ή φωτογραφία."}
            action={
              !materials.length && (
                <Button onClick={() => openPrepare({ slotId: null })}>
                  <Sparkles className="size-4" /> Νέο υλικό
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line-2">
            {list.map((m) => {
              const lessons = slots.filter((s) => s.materialIds.includes(m.id)).length;
              const cls = classes.find((c) => c.id === m.classId);
              return (
                <li key={m.id} className="group flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <FileBadge file={m.file} />
                  <Link href={`/materials/${m.id}`} className="min-w-0 flex-1">
                    <span className="block truncate font-semibold group-hover:underline">{m.title}</span>
                    <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                      <span>{KIND_LABEL[m.kind]}</span>
                      <span>· {cls?.name}</span>
                      {m.file && <span className="hidden sm:inline">· {fileKindLabel(m.file.type, m.file.name)} {formatBytes(m.file.size)}</span>}
                      {lessons > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-brand-500">
                          · <Paperclip className="size-3" /> {lessons} {lessons === 1 ? "μάθημα" : "μαθήματα"}
                        </span>
                      )}
                    </span>
                  </Link>
                  <SubjectIcon id={m.subjectId} size="sm" className="hidden sm:inline-flex" />
                  <span className="hidden w-28 text-right text-sm text-muted md:block">{relativeTime(m.updatedAt)}</span>
                  <button
                    type="button"
                    aria-label={`Διαγραφή: ${m.title}`}
                    onClick={() => {
                      const undo = del(m.id);
                      toast(lessons ? `Διαγράφηκε, και από ${lessons} ${lessons === 1 ? "μάθημα" : "μαθήματα"}` : "Το υλικό διαγράφηκε", undo && { label: "Αναίρεση", run: undo });
                    }}
                    className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-line-2 hover:text-danger hover-capable:opacity-0 hover-capable:group-hover:opacity-100 focus:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
