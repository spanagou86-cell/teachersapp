import "server-only";

/**
 * Thin client for the Anthropic Messages API. Every call forces a single tool so the
 * model answers with JSON that matches a schema instead of free text.
 */

const API = "https://api.anthropic.com/v1/messages";
export const AI_MODEL = process.env.AI_MODEL || "claude-haiku-4-5-20251001";

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

export type Part =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

export class AiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function callTool<T>({
  system,
  content,
  tool,
  maxTokens = 4096,
}: {
  system: string;
  content: Part[];
  tool: { name: string; description: string; input_schema: object };
  maxTokens?: number;
}): Promise<T> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError("not configured", 503);
  const res = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: maxTokens,
      // The instructions are identical on every call, so they are cached (cheaper input).
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content }],
    }),
    signal: AbortSignal.timeout(110_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("anthropic", res.status, detail.slice(0, 500));
    throw new AiError("upstream", res.status === 429 || res.status === 529 ? 503 : 502);
  }
  const data = (await res.json()) as { content: { type: string; name?: string; input?: unknown }[]; stop_reason?: string };
  const use = data.content.find((c) => c.type === "tool_use" && c.name === tool.name);
  if (!use?.input) throw new AiError("no answer", 502);
  if (data.stop_reason === "max_tokens") throw new AiError("too long", 413);
  return use.input as T;
}
