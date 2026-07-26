// Model/effort/tool constants for every Claude call in this app — named
// constants rather than inline literals so cost/quality tradeoffs (e.g.
// swapping to claude-sonnet-5) are a one-line change. See README "Cost note".
export const MODEL = "claude-opus-5";
export const EFFORT = "medium"; // low | medium | high | xhigh | max
export const WEB_SEARCH_TOOL = { type: "web_search_20260209", name: "web_search" };
