import "server-only";
import { buildRequest, type Part, type Tier, type Tool } from "./request";

export type { Part, Tier } from "./request";

/**
 * Thin client for the Anthropic Messages API. Every call answers through a single tool, so
 * the model returns JSON that matches a schema instead of free text.
 */

const API = "https://api.anthropic.com/v1/messages";

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

export class AiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Answer = { content: { type: string; name?: string; input?: unknown }[]; stop_reason?: string };

async function send(req: ReturnType<typeof buildRequest>, key: string): Promise<Answer> {
  const res = await fetch(API, {
    method: "POST",
    headers: { ...req.headers, "x-api-key": key },
    body: JSON.stringify(req.body),
    signal: AbortSignal.timeout(110_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("anthropic", res.status, detail.slice(0, 500));
    throw new AiError("upstream", res.status === 429 || res.status === 529 ? 503 : 502);
  }
  return (await res.json()) as Answer;
}

export async function callTool<T>({
  tier,
  system,
  content,
  tool,
  maxTokens = 4096,
}: {
  tier: Tier;
  system: string;
  content: Part[];
  tool: Tool;
  maxTokens?: number;
}): Promise<T> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError("not configured", 503);
  // Haiku is forced to the tool; Sonnet is asked to use it, and asked once more if it didn't.
  for (const nudge of tier === "quality" ? [false, true] : [false]) {
    const data = await send(buildRequest({ tier, system, content, tool, maxTokens, nudge }), key);
    if (data.stop_reason === "refusal") throw new AiError("refused", 422);
    if (data.stop_reason === "max_tokens") throw new AiError("too long", 413);
    const use = data.content.find((c) => c.type === "tool_use" && c.name === tool.name);
    if (use?.input) return use.input as T;
  }
  throw new AiError("no answer", 502);
}
