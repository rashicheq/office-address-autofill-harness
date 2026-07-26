// Section registry: metadata only. Prompt text lives in
// config/system_prompts/*.md, loaded at request time — never hardcoded here.
export const SECTIONS = [
  {
    key: "credit_card_deep_dive",
    label: "Credit Card Deep Dive",
    highlight: true,
    promptFile: "credit_card_deep_dive.md",
  },
  {
    key: "co_branded_cards",
    label: "Co-Branded Cards & New Launches",
    highlight: true,
    promptFile: "co_branded_cards.md",
  },
  { key: "policy_regulation", label: "Policy & Regulation", promptFile: "policy_regulation.md" },
  { key: "tech_developments", label: "Tech Developments", promptFile: "tech_developments.md" },
  { key: "partnerships_deals", label: "Partnerships & Deals", promptFile: "partnerships_deals.md" },
  { key: "user_sentiment", label: "User Sentiment & Behavior", promptFile: "user_sentiment.md" },
  { key: "patterns", label: "Patterns", promptFile: "patterns.md" },
  { key: "market_shifts", label: "Market Shifts", promptFile: "market_shifts.md" },
  { key: "adjacent_trends", label: "Adjacent Trends", promptFile: "adjacent_trends.md" },
  { key: "ai_fintech", label: "AI & Fintech", promptFile: "ai_fintech.md" },
];

export const SECTION_LABELS = Object.fromEntries(SECTIONS.map((s) => [s.key, s.label]));
