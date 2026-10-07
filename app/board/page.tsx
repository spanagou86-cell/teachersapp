"use client";

import clsx from "clsx";
import { ArrowLeft, ArrowRight, Eye, Maximize2, Shuffle, Timer, X } from "@/components/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart } from "@/components/doc/DocPage";
import { useClock } from "@/components/lesson";
import { drawName, toSlides } from "@/lib/board";
import { timeToMin } from "@/lib/dates";
import { useApp } from "@/lib/store";
import { useSubjects } from "@/lib/store/hooks";

const TIMERS = [1, 3, 5, 10];
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** A short bell when the timer ends; nothing if the browser won't play sound. */
function ding() {
  try {
    const ctx = new AudioContext();
    for (const [t, f] of [
      [0, 880],
      [0.18, 1175],
    ]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.7);
    }
  } catch {
    /* no sound */
  }
}

/**
 * «Στην τάξη» on the class board: the lesson's sheet one exercise at a time, in big letters,
 * with the answer on demand, a timer and a name drawn at random. Pupils' names stay on this device.
 */
function Board() {
  const params = useSearchParams();
  const router = useRouter();
  const clock = useClock();
  const slots = useApp((s) => s.slots);
  const materials = useApp((s) => s.materials);
  const students = useApp((s) => s.students);
  const classes = useApp((s) => s.classes);
  const subjects = useSubjects();
  const attendance = useApp((s) => s.attendance);

  const slot = slots.find((s) => s.id === params.get("lesson"));
  const choices = useMemo(() => {
    const own = slot ? slot.materialIds.map((id) => materials.find((m) => m.id === id)) : [materials.find((m) => m.id === params.get("m"))];
    return own.filter((m) => m !== undefined && m.blocks.length > 0);
  }, [slot, materials, params]);
  const [materialId, setMaterialId] = useState(() => params.get("m") ?? undefined);
  const material = choices.find((m) => m!.id === materialId) ?? choices[0];
  const slides = useMemo(() => (material ? toSlides(material.title, material.blocks) : []), [material]);

  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState(false);
  const slide = slides[Math.min(i, slides.length - 1)];
  const go = useCallback(
    (d: number) => {
      setI((x) => Math.max(0, Math.min(slides.length - 1, x + d)));
      setAnswer(false);
    },
    [slides.length],
  );

  // Timer
  const [left, setLeft] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  useEffect(() => {
    if (left === null || paused || left <= 0) return;
    const h = setTimeout(() => setLeft((l) => (l === null ? null : l - 1)), 1000);
    return () => clearTimeout(h);
  }, [left, paused]);
  useEffect(() => {
    if (left === 0) ding();
  }, [left]);

  // A name at random: the pupils present today, everyone once before anyone twice.
  const classId = slot?.classId ?? material?.classId;
  const absent = new Set(classId ? (attendance[`${classId}|${clock.today}`]?.absentIds ?? []) : []);
  const names = students.filter((s) => s.classId === classId && !absent.has(s.id)).map((s) => `${s.firstName} ${s.lastName}`.trim());
  const drawn = useRef(new Set<string>());
  const [picked, setPicked] = useState<{ name: string; rolling: boolean } | null>(null);
  const pick = () => {
    const r = drawName(names, drawn.current);
    if (!r) return;
    drawn.current = r.drawn;
    let n = 0;
    const roll = setInterval(() => {
      setPicked({ name: names[Math.floor(Math.random() * names.length)], rolling: true });
      if (++n >= 9) {
        clearInterval(roll);
        setPicked({ name: r.name, rolling: false });
      }
    }, 70);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
      else if (e.key.toLowerCase() === "l" || e.key === "λ") setAnswer((a) => !a);
      else if (e.key === "Escape") setPicked(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const exit = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    router.push(slot ? `/lessons/${slot.id}` : material ? `/materials/${material.id}` : "/");
  };
  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const subject = subjects.find((s) => s.id === (slot?.subjectId ?? material?.subjectId))?.name;
  const cls = classes.find((c) => c.id === classId)?.name;
  const now = slot && slot.date === clock.today && timeToMin(clock.now) >= timeToMin(slot.start) && timeToMin(clock.now) < timeToMin(slot.end);

  const bar = "flex h-11 items-center gap-2 rounded-xl px-3.5 text-[15px] font-semibold transition-colors";
  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-[radial-gradient(120%_90%_at_10%_0%,#1e3a8a_0%,#0f1d47_55%,#0a1433_100%)] text-white"
      role="dialog"
      aria-label="Στον πίνακα"
    >
      {/* Top: what's on the board, and the tools. */}
      <header className="flex flex-wrap items-center gap-2 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <button type="button" onClick={exit} aria-label="Έξοδος από τον πίνακα" className={clsx(bar, "bg-white/10 hover:bg-white/20")}>
          <X className="size-5" />
        </button>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-[13px] font-semibold uppercase tracking-[0.12em] text-white/55">
            {[subject, cls, now ? "τώρα" : null].filter(Boolean).join(" · ")}
          </p>
          {choices.length > 1 ? (
            <select
              value={material?.id}
              onChange={(e) => (setMaterialId(e.target.value), setI(0), setAnswer(false))}
              aria-label="Υλικό στον πίνακα"
              className="max-w-full truncate bg-transparent text-[17px] font-semibold outline-none [&>option]:text-ink"
            >
              {choices.map((m) => (
                <option key={m!.id} value={m!.id}>
                  {m!.title}
                </option>
              ))}
            </select>
          ) : (
            <p className="truncate text-[17px] font-semibold">{material?.title}</p>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setTimerOpen((o) => !o)}
            aria-expanded={timerOpen}
            className={clsx(bar, left !== null ? "bg-amber-400 text-ink" : "bg-white/10 hover:bg-white/20")}
          >
            <Timer className="size-5" />
            {left !== null ? <span className="tabular-nums">{mmss(left)}</span> : <span className="max-sm:hidden">Χρόνος</span>}
          </button>
          {timerOpen && (
            <div className="absolute right-0 top-12 z-10 grid w-56 gap-2 rounded-2xl bg-white p-3 text-ink shadow-pop">
              <div className="grid grid-cols-4 gap-1.5">
                {TIMERS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => (setLeft(m * 60), setPaused(false), setTimerOpen(false))}
                    className="h-10 rounded-lg bg-bg text-[15px] font-semibold hover:bg-brand-50"
                  >
                    {m}′
                  </button>
                ))}
              </div>
              {left !== null && (
                <div className="grid grid-cols-2 gap-1.5">
                  <button type="button" onClick={() => setPaused((p) => !p)} className="h-9 rounded-lg bg-bg text-[13px] font-semibold hover:bg-line-2">
                    {paused ? "Συνέχεια" : "Παύση"}
                  </button>
                  <button
                    type="button"
                    onClick={() => (setLeft(null), setTimerOpen(false))}
                    className="h-9 rounded-lg bg-bg text-[13px] font-semibold hover:bg-line-2"
                  >
                    Σταμάτα
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <button type="button" onClick={pick} disabled={!names.length} className={clsx(bar, "bg-white/10 hover:bg-white/20 disabled:opacity-40")}>
          <Shuffle className="size-5" /> <span className="max-sm:hidden">Ποιος απαντά;</span>
        </button>
        <button type="button" onClick={fullscreen} aria-label="Πλήρης οθόνη" className={clsx(bar, "bg-white/10 hover:bg-white/20 max-sm:hidden")}>
          <Maximize2 className="size-5" />
        </button>
      </header>

      {/* The slide: big enough to read from the back of the class. */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4 sm:px-12">
        {!slide ? (
          <div className="m-auto max-w-xl text-center">
            <p className="text-2xl font-semibold">Δεν υπάρχει φύλλο για τον πίνακα</p>
            <p className="mt-2 text-white/70">Φτιάξε υλικό με το «Ετοίμασε» και άνοιξέ το εδώ.</p>
          </div>
        ) : (
          // Centred when it fits, scrolling from the top when it doesn't; the chart sits beside the question on wide boards.
          <article
            key={`${material?.id}-${i}`}
            className={clsx(
              "mx-auto my-auto grid w-full animate-slide-up items-center gap-6",
              slide.chart && slide.kind === "exercise" ? "max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-10" : "max-w-5xl",
            )}
          >
            <div className="grid min-w-0 gap-6">
              {slide.kind === "exercise" && (
                <p className="text-[clamp(1rem,2vw,1.4rem)] font-bold uppercase tracking-[0.14em] text-amber-300">Άσκηση {slide.n}</p>
              )}
              <h1
                className={clsx(
                  "whitespace-pre-line font-semibold leading-[1.2] tracking-[-0.02em] [text-wrap:balance]",
                  slide.kind === "exercise" ? "text-[clamp(1.6rem,4.2vw,3.4rem)]" : "text-[clamp(2rem,5.5vw,4.4rem)]",
                )}
              >
                {slide.title}
              </h1>
              {slide.body.map((t, k) => (
                <p key={k} className="max-w-4xl whitespace-pre-line text-[clamp(1.1rem,2.4vw,1.9rem)] leading-relaxed text-white/85">
                  {t}
                </p>
              ))}
              {slide.kind === "exercise" && answer && (
                <div className="animate-slide-up rounded-2xl bg-emerald-400/15 p-5 ring-1 ring-emerald-300/40" role="status">
                  <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-emerald-200">Λύση</p>
                  <p className="mt-1 whitespace-pre-line text-[clamp(1.2rem,2.8vw,2.2rem)] font-semibold">{slide.answer || "Ελεύθερη απάντηση"}</p>
                </div>
              )}
            </div>
            {slide.chart && (
              <div className="w-full max-w-2xl rounded-2xl bg-white p-4 text-ink sm:p-6">
                <BarChart chart={slide.chart} />
              </div>
            )}
          </article>
        )}
      </main>

      {/* Bottom: back, the answer, next. */}
      <footer className="flex items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={i === 0}
          aria-label="Προηγούμενο"
          className="flex size-14 items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-30"
        >
          <ArrowLeft className="size-6" />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
          {slide?.kind === "exercise" && (
            <button
              type="button"
              onClick={() => setAnswer((a) => !a)}
              className="flex h-14 items-center gap-2 rounded-2xl bg-white px-5 text-[16px] font-semibold text-ink hover:bg-white/90"
            >
              <Eye className="size-5" /> {answer ? "Κρύψε τη λύση" : "Δείξε τη λύση"}
            </button>
          )}
          <span className="text-[14px] font-semibold text-white/60 tabular-nums">
            {slides.length ? `${Math.min(i, slides.length - 1) + 1} / ${slides.length}` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={i >= slides.length - 1}
          aria-label="Επόμενο"
          className="flex size-14 items-center justify-center rounded-2xl bg-white text-ink hover:bg-white/90 disabled:opacity-30"
        >
          <ArrowRight className="size-6" />
        </button>
      </footer>

      {left === 0 && (
        <button type="button" onClick={() => setLeft(null)} className="absolute inset-0 z-20 flex items-center justify-center bg-amber-400/95 text-ink">
          <span className="text-center">
            <span className="block text-[clamp(3rem,10vw,8rem)] font-bold leading-none">Τέλος χρόνου</span>
            <span className="mt-4 block text-xl font-semibold">Πάτα για να συνεχίσεις</span>
          </span>
        </button>
      )}
      {picked && (
        <button
          type="button"
          onClick={() => setPicked(null)}
          className="absolute inset-0 z-20 flex items-center justify-center bg-[#0a1433]/90 backdrop-blur-sm"
          aria-label="Κλείσιμο"
        >
          <span className="text-center">
            <span className="block text-[15px] font-bold uppercase tracking-[0.16em] text-amber-300">Απαντά</span>
            <span
              className={clsx(
                "mt-3 block text-[clamp(3rem,10vw,7.5rem)] font-semibold leading-none tracking-[-0.03em]",
                picked.rolling ? "opacity-60 blur-[1px]" : "animate-slide-up",
              )}
            >
              {picked.name}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

export default function BoardPage() {
  return (
    <Suspense fallback={null}>
      <Board />
    </Suspense>
  );
}
