"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildBlocks } from "../ai/templates";
import { DEMO_TODAY } from "../dates";
import { uid } from "../id";
import { applyChange, restoreOriginal, restoreVersion } from "../materials";
import { carryOverLesson, undoCarryOver, type CarryOverResult, type TimeWindow } from "../schedule";
import { seed, type SeedState } from "../seed";
import type { Block, FileMeta, LessonSlot, Level, Material, MaterialKind, SubjectId } from "../types";
import { deleteBlob } from "./blobs";

export interface NewMaterialInput {
  title: string;
  classId: string;
  subjectId: SubjectId;
  kind: MaterialKind;
  level: Level;
  withSolutions: boolean;
  file?: FileMeta;
  blocks?: Block[];
}

interface Actions {
  reset: () => void;

  toggleTask: (id: string) => void;
  addTask: (text: string) => void;
  removeTask: (id: string) => void;

  toggleAbsent: (classId: string, date: string, studentId: string) => void;
  markAllPresent: (classId: string, date: string) => void;

  updateSlot: (id: string, patch: Partial<Pick<LessonSlot, "status" | "taughtNote" | "topic">>) => void;
  attachMaterial: (slotId: string, materialId: string) => void;
  detachMaterial: (slotId: string, materialId: string) => void;
  carryOver: (slotId: string, target: TimeWindow) => CarryOverResult;
  undoCarryOver: (newSlotId: string) => void;

  createMaterial: (input: NewMaterialInput) => string;
  changeBlocks: (id: string, blocks: Block[], label: string) => void;
  restoreVersion: (id: string, versionId: string) => void;
  restoreOriginal: (id: string) => void;
  patchMaterial: (id: string, patch: Partial<Pick<Material, "title" | "withSolutions" | "blackAndWhite" | "classId" | "subjectId">>) => void;
  duplicateMaterial: (id: string, blocks: Block[], suffix: string) => string;
  deleteMaterial: (id: string) => void;

  addNote: (classId: string, text: string) => void;
  deleteNote: (id: string) => void;
}

export type AppState = SeedState & Actions;

const attendanceKey = (classId: string, date: string) => `${classId}|${date}`;

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...seed(),

      reset: () => set(seed()),

      toggleTask: (id) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
      addTask: (text) => set((s) => ({ tasks: [...s.tasks, { id: uid("t"), text, done: false }] })),
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      toggleAbsent: (classId, date, studentId) =>
        set((s) => {
          const key = attendanceKey(classId, date);
          const absent = s.attendance[key]?.absentIds ?? [];
          const absentIds = absent.includes(studentId) ? absent.filter((x) => x !== studentId) : [...absent, studentId];
          return { attendance: { ...s.attendance, [key]: { absentIds, recordedAt: Date.now() } } };
        }),
      markAllPresent: (classId, date) =>
        set((s) => ({ attendance: { ...s.attendance, [attendanceKey(classId, date)]: { absentIds: [], recordedAt: Date.now() } } })),

      updateSlot: (id, patch) => set((s) => ({ slots: s.slots.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      attachMaterial: (slotId, materialId) =>
        set((s) => ({
          slots: s.slots.map((x) =>
            x.id === slotId && !x.materialIds.includes(materialId) ? { ...x, materialIds: [...x.materialIds, materialId] } : x,
          ),
        })),
      detachMaterial: (slotId, materialId) =>
        set((s) => ({
          slots: s.slots.map((x) => (x.id === slotId ? { ...x, materialIds: x.materialIds.filter((m) => m !== materialId) } : x)),
        })),
      carryOver: (slotId, target) => {
        const result = carryOverLesson(get().slots, slotId, target, uid("l"), DEMO_TODAY);
        if (result.ok) set({ slots: result.slots });
        return result;
      },
      undoCarryOver: (newSlotId) => set((s) => ({ slots: undoCarryOver(s.slots, newSlotId) })),

      createMaterial: (input) => {
        const id = uid("m");
        const now = Date.now();
        const cls = get().classes.find((c) => c.id === input.classId);
        const blocks =
          input.blocks ??
          buildBlocks({
            subjectId: input.subjectId,
            kind: input.kind,
            level: input.level,
            grade: cls?.grade ?? "",
            hint: `${input.title} ${input.file?.name ?? ""}`,
            prefix: id,
          });
        const material: Material = {
          id,
          title: input.title,
          classId: input.classId,
          subjectId: input.subjectId,
          kind: input.kind,
          level: input.level,
          withSolutions: input.withSolutions,
          blackAndWhite: false,
          file: input.file,
          originalBlocks: blocks,
          blocks,
          versions: [{ id: uid("v"), at: now, label: input.file ? "Δημιουργία από αρχείο" : "Δημιουργία", blocks }],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ materials: [material, ...s.materials] }));
        return id;
      },
      changeBlocks: (id, blocks, label) =>
        set((s) => ({ materials: s.materials.map((m) => (m.id === id ? applyChange(m, blocks, label, uid("v"), Date.now()) : m)) })),
      restoreVersion: (id, versionId) =>
        set((s) => ({ materials: s.materials.map((m) => (m.id === id ? restoreVersion(m, versionId, uid("v"), Date.now()) : m)) })),
      restoreOriginal: (id) =>
        set((s) => ({ materials: s.materials.map((m) => (m.id === id ? restoreOriginal(m, uid("v"), Date.now()) : m)) })),
      patchMaterial: (id, patch) =>
        set((s) => ({ materials: s.materials.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m)) })),
      duplicateMaterial: (id, blocks, suffix) => {
        const src = get().materials.find((m) => m.id === id);
        if (!src) return id;
        const newId = uid("m");
        const now = Date.now();
        const copy: Material = {
          ...src,
          id: newId,
          title: `${src.title} ${suffix}`,
          blocks,
          originalBlocks: blocks,
          versions: [{ id: uid("v"), at: now, label: `Αντίγραφο από «${src.title}»`, blocks }],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ materials: [copy, ...s.materials] }));
        return newId;
      },
      deleteMaterial: (id) => {
        const m = get().materials.find((x) => x.id === id);
        const shared = m?.file?.blobKey && get().materials.some((x) => x.id !== id && x.file?.blobKey === m.file?.blobKey);
        if (m?.file?.blobKey && !shared) void deleteBlob(m.file.blobKey);
        set((s) => ({
          materials: s.materials.filter((x) => x.id !== id),
          slots: s.slots.map((x) => ({ ...x, materialIds: x.materialIds.filter((mid) => mid !== id) })),
        }));
      },

      addNote: (classId, text) =>
        set((s) => ({ notes: [{ id: uid("n"), classId, date: DEMO_TODAY, text, createdAt: Date.now() }, ...s.notes] })),
      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
    }),
    {
      name: "taxi-demo",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        slots: s.slots,
        materials: s.materials,
        attendance: s.attendance,
        tasks: s.tasks,
        notes: s.notes,
      }),
    },
  ),
);

export const attendanceFor = (s: AppState, classId: string, date: string) => s.attendance[attendanceKey(classId, date)];
