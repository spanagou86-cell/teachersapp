"use client";

import { ChevronRight, Plus, UserCheck, Users } from "lucide-react";
import { useState } from "react";
import { ClassSheet } from "@/components/classes";
import Link from "next/link";
import { MobileBrandBar, PageHeader } from "@/components/shell/PageHeader";
import { SubjectIcon } from "@/components/subject";
import { Button, Card, cx, EmptyState } from "@/components/ui";
import { nextLesson } from "@/lib/schedule";
import { plural } from "@/lib/plural";
import { useApp } from "@/lib/store";

export default function ClassesPage() {
  const classes = useApp((s) => s.classes);
  const students = useApp((s) => s.students);
  const slots = useApp((s) => s.slots);
  const subjects = useApp((s) => s.subjects);
  const attendance = useApp((s) => s.attendance);
  const today = useApp((s) => s.today);
  const now = useApp((s) => s.now);
  const [creating, setCreating] = useState(false);
  return (
    <div>
      <MobileBrandBar />
      <PageHeader
        title="Οι τάξεις μου"
        subtitle={`${plural(classes.length, "τμήμα", "τμήματα")} · ${plural(students.length, "μαθητής", "μαθητές")}`}
        actions={
          <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
            <Plus className="size-4" /> Νέο τμήμα
          </Button>
        }
      />
      {classes.length === 0 && (
        <Card>
          <EmptyState icon={<Users className="size-6" />} title="Δεν έχεις τμήματα ακόμη" text="Πρόσθεσε το πρώτο σου τμήμα και τους μαθητές του." />
        </Card>
      )}
      {creating && <ClassSheet open onClose={() => setCreating(false)} />}
      <div className="grid gap-4 md:grid-cols-2">
        {classes.map((c) => {
          const count = students.filter((s) => s.classId === c.id).length;
          const att = attendance[`${c.id}|${today}`];
          const next = nextLesson(slots.filter((s) => s.classId === c.id), today, now);
          return (
            <Link key={c.id} href={`/classes/${c.id}`} className="group">
              <Card className="p-5 transition group-hover:shadow-pop">
                <div className="flex items-center gap-4">
                  <span
                    className={cx(
                      "flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand px-1 text-center font-extrabold leading-tight text-white",
                      c.name.length <= 3 ? "text-xl" : "line-clamp-2 break-all text-xs",
                    )}
                  >
                    {c.name}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold">{c.grade}</p>
                    <p className="text-sm text-muted">
                      {[plural(count, "μαθητής", "μαθητές"), c.room].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-line-2 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                      <UserCheck className="size-3.5" /> Παρουσίες σήμερα
                    </p>
                    <p className="mt-1 font-bold">{att ? (
                        `${count - att.absentIds.length}/${count} παρόντες`
                      ) : slots.some((s) => s.classId === c.id && s.date === today) ? (
                        <span className="text-danger">Δεν καταγράφηκαν</span>
                      ) : (
                        <span className="font-medium text-muted">Χωρίς μάθημα σήμερα</span>
                      )}</p>
                  </div>
                  <div className="rounded-xl bg-line-2 p-3">
                    <p className="text-xs font-semibold text-muted">Επόμενο μάθημα</p>
                    {next ? (
                      <p className="mt-1 flex items-center gap-1.5 font-bold">
                        <SubjectIcon id={next.subjectId} size="sm" className="size-5 [&>svg]:size-3" />
                        <span className="truncate">{subjects.find((x) => x.id === next.subjectId)?.name} · {next.start}</span>
                      </p>
                    ) : (
                      <p className="mt-1 font-bold text-muted">Όχι άλλο σήμερα</p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
