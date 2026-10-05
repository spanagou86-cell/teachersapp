import { describe, expect, it } from "vitest";
import { buildRequest } from "../request";

const tool = { name: "material", description: "x", input_schema: { type: "object" } };
const base = { system: "Οδηγίες", content: [{ type: "text" as const, text: "Φύλλο" }], tool };

describe("buildRequest", () => {
  it("worksheets go to Sonnet without a forced tool, with fallback and room to think", () => {
    const { headers, body } = buildRequest({ ...base, tier: "quality", maxTokens: 8000 });
    expect(body.model).toBe("claude-sonnet-5-5");
    expect(body.tool_choice).toEqual({ type: "auto" });
    expect(body.output_config).toEqual({ effort: "medium" });
    expect(body.fallbacks).toBe("default");
    expect(headers["anthropic-beta"]).toBe("server-side-fallback-2026-07-01");
    expect(body.max_tokens).toBeGreaterThanOrEqual(16000);
    expect(JSON.stringify(body.system)).toContain("material");
  });

  it("photo reading stays on Haiku with the forced tool", () => {
    const { headers, body } = buildRequest({ ...base, tier: "fast", maxTokens: 4000 });
    expect(body.model).toBe("claude-haiku-4-5");
    expect(body.tool_choice).toEqual({ type: "tool", name: "material" });
    expect(body.max_tokens).toBe(4000);
    expect(body.fallbacks).toBeUndefined();
    expect(headers["anthropic-beta"]).toBeUndefined();
  });

  it("the second try asks for the tool by name", () => {
    const { body } = buildRequest({ ...base, tier: "quality", nudge: true });
    const msg = (body.messages as { content: { text?: string }[] }[])[0].content;
    expect(msg.at(-1)?.text).toBe("Χρησιμοποίησε το εργαλείο material.");
  });
});
