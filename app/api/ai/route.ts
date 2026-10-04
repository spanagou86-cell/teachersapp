import { NextResponse, type NextRequest } from "next/server";
import { AiError, aiConfigured, callTool, type Part } from "@/lib/ai/claude";
import { ADAPT_SYSTEM, ADAPT_TOOL, CREATE_SYSTEM, CREATE_TOOL, TIMETABLE_SYSTEM, TIMETABLE_TOOL } from "@/lib/ai/prompts";
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
            str("hint", 500) && `Οδηγία εκπαιδευτικού: ${str("hint", 500)}`,
            path ? "Βασίσου στο συνημμένο αρχείο." : "Δεν υπάρχει αρχείο· φτιάξε πρωτότυπο υλικό για το θέμα.",
          ]
            .filter(Boolean)
            .join("\n"),
        });
        const out = await callTool<{ blocks: unknown[] }>({ system: CREATE_SYSTEM, content, tool: CREATE_TOOL, maxTokens: 8000 });
        return NextResponse.json(out);
      }
      case "adapt": {
        const blocks = JSON.stringify(body.blocks ?? []);
        if (blocks.length > 60_000) return fail(413, "Το υλικό είναι πολύ μεγάλο για προσαρμογή.");
        const out = await callTool<{ blocks: unknown[]; versionB?: unknown[]; summary: string }>({
          system: ADAPT_SYSTEM,
          content: [
            {
              type: "text",
              text: [
                `Μάθημα: ${str("subject")} · Τάξη: ${str("grade")}`,
                `Ενέργειες: ${(Array.isArray(body.actions) ? body.actions : []).join(", ") || "—"}`,
                str("target") && `Άλλαξε ΜΟΝΟ το block με id ${str("target")}.`,
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
      case "timetable": {
        const type = str("mediaType");
        const data = str("data", 16_000_000);
        if (!data || !(IMAGE_TYPES.includes(type) || type === "application/pdf")) return fail(415, "Ανέβασε φωτογραφία ή PDF του προγράμματος.");
        const file: Part =
          type === "application/pdf"
            ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
            : { type: "image", source: { type: "base64", media_type: type, data } };
        const out = await callTool<{ entries: unknown[]; teacher?: string; notes?: string }>({
          system: TIMETABLE_SYSTEM,
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
      default:
        return fail(400, "Λάθος αίτημα.");
    }
  } catch (e) {
    if (e instanceof AiError) {
      if (e.status === 413) return fail(413, "Η απάντηση βγήκε πολύ μεγάλη. Δοκίμασε με μικρότερο αρχείο ή λιγότερες σελίδες.");
      if (e.status === 503) return fail(503, "Η υπηρεσία AI είναι προσωρινά απασχολημένη. Ξαναδοκίμασε σε λίγο.");
      return fail(502, "Το AI δεν απάντησε σωστά. Ξαναδοκίμασε.");
    }
    if (e instanceof Error && e.name === "TimeoutError") return fail(504, "Το AI άργησε πολύ. Ξαναδοκίμασε.");
    console.error(e);
    return fail(500, "Κάτι πήγε στραβά. Ξαναδοκίμασε.");
  }
}
