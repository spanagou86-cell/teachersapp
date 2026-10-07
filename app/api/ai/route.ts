import { NextResponse, type NextRequest } from "next/server";
import { AiError, aiConfigured, callTool, type Part } from "@/lib/ai/claude";
import { ADAPT_SYSTEM, ADAPT_TOOL, createSystem, CREATE_TOOL, CY_MATHS_PROGRAMME, isCountry, LEVELS_TOOL, objectivesSystem, OBJECTIVES_TOOL, ROSTER_SYSTEM, ROSTER_TOOL, SEP_SYSTEM, SEP_TOOL, SYLLABUS_SYSTEM, SYLLABUS_TOOL, timetableSystem, TIMETABLE_TOOL } from "@/lib/ai/prompts";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Requests per teacher per day; keeps a runaway bill impossible. */
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 60);
const MAX_FILE = 12 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

async function fileParts(bytes: ArrayBuffer, type: string, name: string): Promise<Part[] | string> {
  if (bytes.byteLength > MAX_FILE) return "Το αρχείο είναι πολύ μεγάλο για ανάγνωση (μέχρι 12 MB).";
  const data = Buffer.from(bytes).toString("base64");
  if (type === "application/pdf" || /\.pdf$/i.test(name)) return [{ type: "document", source: { type: "base64", media_type: "application/pdf", data } }];
  if (IMAGE_TYPES.includes(type)) return [{ type: "image", source: { type: "base64", media_type: type, data } }];
  if (/\.docx$/i.test(name) || type.includes("wordprocessingml")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    if (!value.trim()) return "Δεν βρέθηκε κείμενο στο έγγραφο Word.";
    return [{ type: "text", text: `Περιεχόμενο εγγράφου «${name}»:\n\n${value.slice(0, 60_000)}` }];
  }
  return "Αυτή η μορφή δεν διαβάζεται. Αποθήκευσε το αρχείο ως PDF ή φωτογραφία και ξαναδοκίμασε.";
}

/** A photo or PDF sent straight from the browser (already shrunk there). */
function inlineFile(type: string, data: string): Part | undefined {
  if (!data) return undefined;
  if (type === "application/pdf") return { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
  if (IMAGE_TYPES.includes(type)) return { type: "image", source: { type: "base64", media_type: type, data } };
  return undefined;
}

export async function POST(req: NextRequest) {
  if (!aiConfigured()) return fail(503, "not-configured");
  const client = await supabaseServer();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return fail(401, "Χρειάζεται σύνδεση.");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Λάθος αίτημα.");
  }
  const str = (k: string, max = 300) => (typeof body[k] === "string" ? (body[k] as string).slice(0, max) : "");
  const country = isCountry(body.country) ? body.country : "gr";

  const { data: allowed, error: quotaError } = await client.rpc("ai_take", { daily_limit: DAILY_LIMIT });
  if (quotaError) return fail(500, "Δεν ήταν δυνατός ο έλεγχος ορίου.");
  if (!allowed) return fail(429, `Έφτασες το ημερήσιο όριο των ${DAILY_LIMIT} αιτημάτων AI. Ξαναδοκίμασε αύριο.`);

  try {
    switch (body.op) {
      case "create": {
        const path = str("path", 500);
        const content: Part[] = [];
        if (path) {
          if (!path.startsWith(`${user.id}/`)) return fail(403, "Δεν επιτρέπεται.");
          const { data, error } = await client.storage.from("materials").download(path);
          if (error || !data) return fail(404, "Δεν βρέθηκε το αρχείο.");
          const parts = await fileParts(await data.arrayBuffer(), data.type || str("mediaType"), str("fileName"));
          if (typeof parts === "string") return fail(415, parts);
          content.push(...parts);
        }
        content.push({
          type: "text",
          text: [
            `Είδος υλικού: ${str("kindLabel")}`,
            `Μάθημα: ${str("subject")}`,
            `Τάξη: ${str("grade")}`,
            `Επίπεδο: ${str("levelLabel")}`,
            `Τίτλος/θέμα: ${str("title")}`,
            `Λύσεις: ${body.withSolutions ? "ναι, συμπλήρωσε answer σε κάθε άσκηση" : "όχι"}`,
            str("hint", 1500) && `Τι ζητά ο εκπαιδευτικός:\n${str("hint", 1500)}`,
            path ? "Βασίσου στο συνημμένο αρχείο." : "Δεν υπάρχει αρχείο· φτιάξε πρωτότυπο υλικό για το θέμα.",
          ]
            .filter(Boolean)
            .join("\n"),
        });
        const levels = body.levels === true;
        const out = await callTool<{ blocks: unknown[] }>({
          tier: "quality",
          system: createSystem(country),
          content,
          tool: levels ? LEVELS_TOOL : CREATE_TOOL,
          maxTokens: levels ? 12000 : 8000,
        });
        return NextResponse.json(out);
      }
      case "adapt": {
        const blocks = JSON.stringify(body.blocks ?? []);
        if (blocks.length > 60_000) return fail(413, "Το υλικό είναι πολύ μεγάλο για προσαρμογή.");
        const out = await callTool<{ blocks: unknown[]; versionB?: unknown[]; summary: string }>({
          tier: "quality",
          system: ADAPT_SYSTEM,
          content: [
            {
              type: "text",
              text: [
                `Μάθημα: ${str("subject")} · Τάξη: ${str("grade")}`,
                `Ενέργειες: ${(Array.isArray(body.actions) ? body.actions : []).join(", ") || "—"}`,
                str("target") && `Άλλαξε ΜΟΝΟ το block με id ${str("target")} (όσες νέες ασκήσεις ζητηθούν μπαίνουν στο τέλος).`,
                `Οδηγία εκπαιδευτικού: ${str("prompt", 500) || "—"}`,
                `Τρέχον υλικό (JSON):\n${blocks}`,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
          tool: ADAPT_TOOL,
          maxTokens: 8000,
        });
        return NextResponse.json(out);
      }
      case "roster": {
        const file = inlineFile(str("mediaType"), str("data", 16_000_000));
        if (!file) return fail(415, "Ανέβασε φωτογραφία ή PDF της λίστας.");
        const out = await callTool<{ students: unknown[]; className?: string; notes?: string }>({
          tier: "fast",
          system: ROSTER_SYSTEM,
          content: [file, { type: "text", text: `Τμήμα για το οποίο προορίζεται: ${str("className") || "—"}` }],
          tool: ROSTER_TOOL,
          maxTokens: 4000,
        });
        return NextResponse.json(out);
      }
      case "timetable": {
        const file = inlineFile(str("mediaType"), str("data", 16_000_000));
        if (!file) return fail(415, "Ανέβασε φωτογραφία ή PDF του προγράμματος.");
        const out = await callTool<{ entries: unknown[]; teacher?: string; notes?: string }>({
          tier: "fast",
          system: timetableSystem(country),
          content: [
            file,
            {
              type: "text",
              text: [
                `Όνομα εκπαιδευτικού (αν το πρόγραμμα είναι όλου του σχολείου, κράτα μόνο τις ώρες του/της): ${str("teacher") || "—"}`,
                `Τμήματα που έχει ήδη: ${str("classes", 1000) || "—"}`,
              ].join("\n"),
            },
          ],
          tool: TIMETABLE_TOOL,
          maxTokens: 6000,
        });
        return NextResponse.json(out);
      }
      case "syllabus": {
        const content: Part[] = [];
        const grade = Number(body.grade);
        if (body.source === "cy-maths") {
          // The Ministry's own programme, fetched here so the teacher doesn't have to find it.
          if (!Number.isInteger(grade) || grade < 0 || grade > 5) return fail(400, "Λάθος τάξη.");
          const res = await fetch(CY_MATHS_PROGRAMME(grade), { signal: AbortSignal.timeout(20_000) }).catch(() => undefined);
          if (!res?.ok) return fail(502, "Ο επίσημος προγραμματισμός δεν άνοιξε αυτή τη στιγμή. Δοκίμασε με φωτογραφία των περιεχομένων.");
          const parts = await fileParts(await res.arrayBuffer(), "application/pdf", "programmatismos.pdf");
          if (typeof parts === "string") return fail(415, parts);
          content.push(...parts);
        } else {
          const path = str("path", 500);
          if (path) {
            if (!path.startsWith(`${user.id}/`)) return fail(403, "Δεν επιτρέπεται.");
            const { data, error } = await client.storage.from("materials").download(path);
            if (error || !data) return fail(404, "Δεν βρέθηκε το αρχείο.");
            const parts = await fileParts(await data.arrayBuffer(), data.type || str("mediaType"), str("fileName"));
            if (typeof parts === "string") return fail(415, parts);
            content.push(...parts);
          } else {
            const file = inlineFile(str("mediaType"), str("data", 16_000_000));
            if (!file) return fail(415, "Ανέβασε φωτογραφία ή PDF των περιεχομένων.");
            content.push(file);
          }
        }
        content.push({ type: "text", text: `Μάθημα: ${str("subject")} · Τάξη: ${str("gradeLabel")}` });
        const out = await callTool<{ items: unknown[]; notes?: string }>({ tier: "quality", system: SYLLABUS_SYSTEM, content, tool: SYLLABUS_TOOL, maxTokens: 8000 });
        return NextResponse.json(out);
      }
      case "sep": {
        // A child's ratings with their labels, grade and gender: never a name or a note.
        const lines = (Array.isArray(body.ratings) ? body.ratings : [])
          .slice(0, 60)
          .map((x: Record<string, unknown>) => `${String(x?.label ?? "").slice(0, 80)}: ${String(x?.value ?? "").slice(0, 40)}`)
          .join("\n");
        if (!lines.trim()) return fail(400, "Βάλε πρώτα βαθμίδες.");
        const gender = body.gender === "f" ? "κορίτσι" : "αγόρι";
        const out = await callTool<Record<string, string>>({
          tier: "quality",
          system: SEP_SYSTEM,
          content: [{ type: "text", text: `Τάξη: ${str("grade", 40)} · ${body.term === 2 ? "Β΄" : "Α΄"} τετράμηνο · Γένος: ${gender}\n\nΒαθμίδες:\n${lines}` }],
          tool: SEP_TOOL,
          maxTokens: 2500,
        });
        return NextResponse.json(out);
      }
      case "objectives": {
        // Only subject, grade and topic per lesson: nothing about the children.
        const clip = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");
        const lessons = (Array.isArray(body.lessons) ? body.lessons : [])
          .slice(0, 80)
          .map((l: Record<string, unknown>) => ({ id: clip(l?.id, 60), subject: clip(l?.subject, 60), grade: clip(l?.grade, 40), topic: clip(l?.topic, 200) }))
          .filter((l) => l.id);
        if (!lessons.length) return fail(400, "Δεν υπάρχουν μαθήματα.");
        const lines = lessons.map((l) => `${l.id} | ${l.subject} | ${l.grade} | ${l.topic || "(χωρίς θέμα)"}`).join("\n");
        const out = await callTool<{ lessons: unknown[] }>({
          tier: "fast",
          system: objectivesSystem(country),
          content: [{ type: "text", text: `Μαθήματα (id | μάθημα | τάξη | θέμα):\n${lines}` }],
          tool: OBJECTIVES_TOOL,
          maxTokens: 6000,
        });
        return NextResponse.json(out);
      }
      default:
        return fail(400, "Λάθος αίτημα.");
    }
  } catch (e) {
    if (e instanceof AiError) {
      if (e.status === 413) return fail(413, "Η απάντηση βγήκε πολύ μεγάλη. Δοκίμασε με μικρότερο αρχείο ή λιγότερες σελίδες.");
      if (e.status === 422) return fail(422, "Το AI δεν μπόρεσε να το φτιάξει. Δοκίμασε άλλη διατύπωση.");
      if (e.status === 503) return fail(503, "Η υπηρεσία AI είναι προσωρινά απασχολημένη. Ξαναδοκίμασε σε λίγο.");
      return fail(502, "Το AI δεν απάντησε σωστά. Ξαναδοκίμασε.");
    }
    if (e instanceof Error && e.name === "TimeoutError") return fail(504, "Το AI άργησε πολύ. Ξαναδοκίμασε.");
    console.error(e);
    return fail(500, "Κάτι πήγε στραβά. Ξαναδοκίμασε.");
  }
}
