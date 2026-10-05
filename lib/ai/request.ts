/**
 * Builds the Messages API request for each AI task. Pure, so it can be tested without a key.
 * "quality" (worksheets) runs on Sonnet; "fast" (reading a photo) runs on Haiku.
 */

export type Tier = "quality" | "fast";

export type Part =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

export interface Tool {
  name: string;
  description: string;
  input_schema: object;
}

export const MODELS: Record<Tier, string> = {
  quality: process.env.AI_MODEL_QUALITY || "claude-sonnet-5-5",
  fast: process.env.AI_MODEL_FAST || "claude-haiku-4-5",
};

/** Room for the model's thinking on top of the answer itself. */
const QUALITY_MIN_TOKENS = 16000;

export function buildRequest({
  tier,
  system,
  content,
  tool,
  maxTokens = 4096,
  nudge = false,
}: {
  tier: Tier;
  system: string;
  content: Part[];
  tool: Tool;
  maxTokens?: number;
  /** Second try after an answer without the tool: ask for it once more. */
  nudge?: boolean;
}): { headers: Record<string, string>; body: Record<string, unknown> } {
  const headers: Record<string, string> = { "content-type": "application/json", "anthropic-version": "2023-06-01" };
  const messages: { role: "user"; content: Part[] }[] = [
    { role: "user", content: nudge ? [...content, { type: "text", text: `Χρησιμοποίησε το εργαλείο ${tool.name}.` }] : content },
  ];

  if (tier === "fast") {
    return {
      headers,
      body: {
        model: MODELS.fast,
        max_tokens: maxTokens,
        // The instructions are identical on every call, so they are cached (cheaper input).
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        tools: [tool],
        tool_choice: { type: "tool", name: tool.name },
        messages,
      },
    };
  }

  // Sonnet 5.5 doesn't take a forced tool: ask for it in the instructions instead.
  // If it declines a request, the API answers it with another model in the same call.
  headers["anthropic-beta"] = "server-side-fallback-2026-07-01";
  return {
    headers,
    body: {
      model: MODELS.quality,
      max_tokens: Math.max(maxTokens, QUALITY_MIN_TOKENS),
      system: [{ type: "text", text: `${system}\n\nΑπάντησε πάντα καλώντας το εργαλείο ${tool.name}.`, cache_control: { type: "ephemeral" } }],
      tools: [tool],
      tool_choice: { type: "auto" },
      output_config: { effort: "medium" },
      fallbacks: "default",
      messages,
    },
  };
}
