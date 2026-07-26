// The only file in this app that talks to the Anthropic API. Model/effort/
// tool are imported constants (src/config.js) so they're a one-line change.
import Anthropic from "@anthropic-ai/sdk";
import { MODEL, EFFORT, WEB_SEARCH_TOOL } from "../config.js";

let client;
function getClient() {
  // Constructed lazily so a missing ANTHROPIC_API_KEY doesn't crash the
  // server at import time — the /health check and static routes still work,
  // and the failure surfaces clearly on the first actual Claude call instead.
  if (!client) client = new Anthropic();
  return client;
}

export class ClaudeRefusalError extends Error {
  constructor(category) {
    super(`Request declined by Claude's safety classifiers (category: ${category ?? "unknown"})`);
    this.name = "ClaudeRefusalError";
    this.category = category;
  }
}

// thinking is intentionally left on its adaptive default (Claude Opus 5
// thinks by default): disabling it is what causes tool calls to occasionally
// land as plain, never-executed text instead of a real web_search call, and
// this app has no other lever to notice that silent failure. Cost/latency is
// controlled via EFFORT instead.
export async function callClaude({ system, userText, maxTokens = 4096, useWebSearch = true }) {
  const params = {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    output_config: { effort: EFFORT },
    messages: [{ role: "user", content: userText }],
  };
  if (useWebSearch) params.tools = [WEB_SEARCH_TOOL];

  const response = await getClient().messages.create(params);

  // Never index response.content unconditionally — a refusal returns HTTP
  // 200 with an empty or partial content array.
  if (response.stop_reason === "refusal") {
    throw new ClaudeRefusalError(response.stop_details?.category ?? null);
  }

  const text = (response.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return { text, stopReason: response.stop_reason };
}

// Calls Claude, parses the response with `parse`, and — per the "retry once
// with a stricter JSON-only instruction" requirement — retries exactly once
// on a parse failure before giving up. On repeated failure the raw model
// output is attached to the thrown error so nothing is silently lost.
export async function callClaudeForJson({ system, userText, parse, maxTokens, useWebSearch = true }) {
  const first = await callClaude({ system, userText, maxTokens, useWebSearch });
  try {
    return { data: parse(first.text), retried: false };
  } catch {
    const retryText = `${userText}\n\nIMPORTANT: Your previous response could not be parsed as JSON. Reply with ONLY valid JSON — no markdown code fences, no prose before or after.`;
    const second = await callClaude({ system, userText: retryText, maxTokens, useWebSearch });
    try {
      return { data: parse(second.text), retried: true };
    } catch (finalErr) {
      const err = new Error(`Model did not return parseable JSON after one retry: ${finalErr.message}`);
      err.rawOutput = second.text;
      err.firstAttemptRawOutput = first.text;
      throw err;
    }
  }
}
