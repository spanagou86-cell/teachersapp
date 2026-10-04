"use client";

import { ChevronRight, UserCheck } from "lucide-react";
import Link from "next/link";
import { MobileBrandBar, PageHeader } from "@/components/shell/PageHeader";
import { SubjectIcon } from "@/components/subject";
import { Card } from "@/components/ui";
import { DEMO_NOW, DEMO_TODAY } from "@/lib/dates";
import { nextLesson } from "@/lib/schedule";
import { useApp } from "@/lib/store";

export default function ClassesPage() {
  const classes = useApp((s) => s.classes);
  const students = useApp((s) => s.students);
  const slots = useApp((s) => s.slots);
  const subjects = useApp((s) => s.subjects);
  const attendance = useApp((s) => s.attendance);
  return (
    <div>
      <MobileBrandBar />
      <PageHeader title="Οι τάξεις μου" subtitle={`${classes.length} τμήματα · ${students.length} μαθητές`} />
      <div className="grid gap-4 md:grid-cols-2">
        {classes.map((c) => {
          const count = students.filter((s) => s.classId === c.id).length;
          const att = attendance[`${c.id}|${DEMO_TODAY}`];
          const next = nextLesson(slots.filter((s) => s.classId === c.id), DEMO_TODAY, DEMO_NOW);
          return (
            <Link key={c.id} href={`/classes/${c.id}`} className="group">
              <Card className="p-5 transition group-hover:shadow-pop">
                <div className="flex items-center gap-4">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-brand text-xl font-extrabold text-white">{c.name}</span>
                  <div className="flex-1">
                    <p className="text-lg font-bold">{c.grade}</p>
                    <p className="text-sm text-muted">
                      {count} μαθητές · {c.room}
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-line-2 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                      <UserCheck className="size-3.5" /> Παρουσίες σήμερα
                    </p>
                    <p className="mt-1 font-bold">{att ? `${count - att.absentIds.length}/${count} παρόντες` : <span className="text-danger">Δεν καταγράφηκαν</span>}</p>
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
