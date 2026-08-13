// Curated vibe taxonomy (PRD OQ-2: curated for launch markets, not
// LLM-inferred — revisit once destination count outgrows ops curation).
// Each vibe carries the identifiers the front end needs to *render* the
// vibe (creature/motif keys) without the front end deciding any of this
// itself — the pairing of "beach" with "turtle" is product data, not a
// styling choice.
export const VIBES = [
  {
    id: "beach",
    label: "Beach",
    creature: "turtle",
    motif: "wave",
    cornerMotif: "shell",
    tags: [
      { key: "chill_beach", label: "Chill beach" },
      { key: "cozy_homestay", label: "Cozy homestay" },
      { key: "snorkelling", label: "Snorkelling" },
      { key: "sunset_views", label: "Sunset views" },
      { key: "off_grid", label: "Off-grid" },
    ],
  },
  {
    id: "snow",
    label: "Snow",
    creature: "penguin",
    motif: "snowflake",
    cornerMotif: "pine",
    tags: [
      { key: "snowfall", label: "Snowfall" },
      { key: "cozy_homestay", label: "Cozy homestay" },
      { key: "trek", label: "Trek" },
      { key: "bonfire_nights", label: "Bonfire nights" },
      { key: "mountain_views", label: "Mountain views" },
    ],
  },
  {
    id: "city",
    label: "City",
    creature: "pigeon",
    motif: "building",
    cornerMotif: "lamp",
    tags: [
      { key: "city_buzz", label: "City buzz" },
      { key: "nightlife", label: "Nightlife" },
      { key: "exhaustive_cuisine", label: "Exhaustive cuisine" },
      { key: "culture_heritage", label: "Culture & heritage" },
      { key: "packed_schedule", label: "Packed schedule" },
    ],
  },
  {
    id: "tropical",
    label: "Tropical",
    creature: "toucan",
    motif: "palm",
    cornerMotif: "mango",
    tags: [
      { key: "off_beaten_path", label: "Off the beaten path" },
      { key: "natural_beauty", label: "Natural beauty" },
      { key: "trek", label: "Trek" },
      { key: "cozy_homestay", label: "Cozy homestay" },
      { key: "slow_travel", label: "Slow travel" },
    ],
  },
];

export function getVibeById(id) {
  return VIBES.find((v) => v.id === id) ?? null;
}
