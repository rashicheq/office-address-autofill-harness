// Curated day templates per destination (2 templated days each). Requesting
// more days than a destination has templates for doesn't repeat content
// silently — the generator fills the remainder from REST_DAY_POOL below,
// so extra days read as deliberate buffer/rest days (PRD FR-5.4), not
// padding.
export const DESTINATION_TEMPLATES = {
  "gili-air": [
    {
      title: "Arrive & settle in",
      slots: [
        { time: "14:00", title: "Boat transfer from Lombok", note: "No cars on the island — cidomo cart to villa" },
        { time: "19:00", title: "Beachfront dinner", note: "Grilled catch-of-the-day, no reservation needed", dietaryFlags: ["vegetarian_friendly"] },
      ],
    },
    {
      title: "Reef day",
      slots: [
        { time: "07:30", title: "Snorkel the turtle point", note: "Gear provided by villa" },
        { time: "17:00", title: "Swing beach at sunset", note: "Photo spot, gets busy after 17:30" },
      ],
    },
  ],
  "havelock-island": [
    {
      title: "Radhanagar beach day",
      slots: [
        { time: "08:00", title: "Ferry from Port Blair", note: "Book the morning ferry — afternoon seas get choppy" },
        { time: "16:30", title: "Radhanagar Beach sunset", note: "Regularly ranked among Asia's best beaches" },
      ],
    },
    {
      title: "Dive day",
      slots: [
        { time: "07:00", title: "Discover scuba dive, Nemo Reef", note: "No certification needed for the intro dive" },
        { time: "19:30", title: "Seafood dinner on the beach", note: "Vegetarian thali available on request", dietaryFlags: ["vegetarian_friendly"] },
      ],
    },
  ],
  varkala: [
    {
      title: "Cliffside arrival",
      slots: [
        { time: "15:00", title: "Check in above the cliff", note: "Rooms with a sea view book out first" },
        { time: "18:30", title: "Sunset at the cliff cafes", note: "Live music at a few cafes most evenings" },
      ],
    },
    {
      title: "Beach & backwaters",
      slots: [
        { time: "07:00", title: "Papanasam Beach at sunrise", note: "Believed to have healing waters — quiet before 8am" },
        { time: "15:00", title: "Backwater canoe ride", note: "Ask your homestay to arrange — cheaper than tour desks" },
      ],
    },
  ],
  manali: [
    {
      title: "Old Manali arrival",
      slots: [
        { time: "16:00", title: "Check in, riverside cafe", note: "Cash preferred in Old Manali lanes" },
        { time: "20:00", title: "Bonfire + Himachali thali", note: "Homestay hosts cook on request", dietaryFlags: ["vegetarian_friendly", "jain_friendly"] },
      ],
    },
    {
      title: "Solang & snow line",
      slots: [
        { time: "08:00", title: "Drive to Solang Valley", note: "Book a cab a day ahead in peak season" },
        { time: "15:00", title: "Ropeway to snow line", note: "Rent boots — sneakers won't hold up" },
      ],
    },
  ],
  gulmarg: [
    {
      title: "Gondola day",
      slots: [
        { time: "09:00", title: "Gulmarg Gondola, Phase 1", note: "Queues build fast after 10am" },
        { time: "13:00", title: "Phase 2 to Apharwat Peak", note: "Weather-dependent — check before buying the full ticket" },
      ],
    },
    {
      title: "Meadow & monastery",
      slots: [
        { time: "10:00", title: "Snowshoe walk across the meadow", note: "Guide recommended off the marked trail" },
        { time: "16:00", title: "Kashmiri wazwan dinner", note: "Vegetarian version available at most homestays", dietaryFlags: ["vegetarian_friendly"] },
      ],
    },
  ],
  auli: [
    {
      title: "Ropeway arrival",
      slots: [
        { time: "11:00", title: "Auli Ropeway (Asia's longest cable car)", note: "Clear morning skies give the best Nanda Devi views" },
        { time: "19:00", title: "Bonfire dinner at the resort", note: "" },
      ],
    },
    {
      title: "Ski or snowshoe day",
      slots: [
        { time: "09:00", title: "Beginner ski lesson", note: "Gear rental available on-site" },
        { time: "17:00", title: "Sunset at Gorson Bugyal viewpoint", note: "Short trek from the main slope" },
      ],
    },
  ],
  tokyo: [
    {
      title: "Shibuya & Shinjuku",
      slots: [
        { time: "11:00", title: "Land, Narita Express to city", note: "Reserve seats — fills up on weekends" },
        { time: "21:00", title: "Omoide Yokocho izakaya crawl", note: "Cash-only stalls, small parties preferred", dietaryFlags: ["vegetarian_friendly"] },
      ],
    },
    {
      title: "Old town & markets",
      slots: [
        { time: "06:00", title: "Tsukiji outer market breakfast", note: "Best before 08:00, stalls sell out" },
        { time: "13:00", title: "Asakusa temple + Nakamise street", note: "Peak crowd 12–3pm, go earlier" },
      ],
    },
  ],
  singapore: [
    {
      title: "Marina Bay orientation",
      slots: [
        { time: "10:00", title: "Gardens by the Bay, Cloud Forest", note: "Book timed entry online to skip the queue" },
        { time: "20:00", title: "Satay Street, Lau Pa Sat", note: "Halal stalls clearly marked", dietaryFlags: ["halal_friendly", "vegetarian_friendly"] },
      ],
    },
    {
      title: "Neighbourhoods on foot",
      slots: [
        { time: "09:00", title: "Tiong Bahru cafe crawl", note: "Art deco blocks, good early light for photos" },
        { time: "18:00", title: "Little India hawker dinner", note: "Vegetarian thali widely available", dietaryFlags: ["vegetarian_friendly"] },
      ],
    },
  ],
  dubai: [
    {
      title: "Old Dubai",
      slots: [
        { time: "09:00", title: "Abra ride across the Creek", note: "A few dirhams, runs constantly" },
        { time: "10:30", title: "Gold & Spice Souk", note: "Bargaining is expected" },
      ],
    },
    {
      title: "New Dubai skyline",
      slots: [
        { time: "16:00", title: "Burj Khalifa, sunset slot", note: "Book the 124th floor a week ahead for sunset timing" },
        { time: "20:00", title: "Dinner at Al Seef", note: "Halal throughout, vegetarian menus common", dietaryFlags: ["halal_friendly", "vegetarian_friendly"] },
      ],
    },
  ],
  mawlynnong: [
    {
      title: "Living root bridges",
      slots: [
        { time: "09:00", title: "Trek to the double-decker root bridge", note: "Slippery in light rain — bring grip shoes" },
        { time: "18:30", title: "Homestay dinner, Khasi thali", note: "Family-run, advance notice appreciated", dietaryFlags: ["vegetarian_friendly"] },
      ],
    },
    {
      title: "Cherrapunji viewpoints",
      slots: [
        { time: "07:00", title: "Nohkalikai Falls at first light", note: "Clearest visibility before cloud cover" },
        { time: "16:00", title: "Mawsmai limestone caves", note: "Bring a torch — some stretches unlit" },
      ],
    },
  ],
  wayanad: [
    {
      title: "Spice country",
      slots: [
        { time: "09:00", title: "Spice plantation walking tour", note: "Ask for the cardamom and pepper vines up close" },
        { time: "17:00", title: "Edakkal Caves viewpoint", note: "Steep climb — worth it for the ghat view" },
      ],
    },
    {
      title: "Wildlife & waterfalls",
      slots: [
        { time: "06:00", title: "Wayanad Wildlife Sanctuary safari", note: "Morning slots see more activity" },
        { time: "15:00", title: "Soochipara Falls", note: "Swimming allowed at the base in dry months" },
      ],
    },
  ],
  coorg: [
    {
      title: "Coffee estate day",
      slots: [
        { time: "10:00", title: "Estate walk & tasting", note: "Most homestays run their own small estate tour" },
        { time: "17:00", title: "Abbey Falls", note: "Best after monsoon, reduced to a trickle by March" },
      ],
    },
    {
      title: "Off the highway",
      slots: [
        { time: "08:00", title: "Talakaveri sunrise", note: "Source of the Kaveri river, quiet before 9am" },
        { time: "16:00", title: "Namdroling Monastery", note: "Respectful dress requested inside" },
      ],
    },
  ],
};

// Cycled in once a trip runs longer than its destination's templated days —
// buffer/rest days are a deliberate option (PRD FR-5.4), not an accident of
// scheduling gaps.
export const REST_DAY_POOL = {
  beach: [
    { title: "Slow morning, open afternoon", note: "Nothing scheduled — hammock, book, tide pools" },
    { title: "Wander, no plan", note: "Explore the coastline in whichever direction looks good" },
  ],
  snow: [
    { title: "Rest day by the fire", note: "Legs recover, cafe-hop the village lanes" },
    { title: "Open afternoon", note: "Sauna or a slow walk — no slopes today" },
  ],
  city: [
    { title: "Unplanned neighbourhood day", note: "Pick a district you haven't seen and just walk it" },
    { title: "Buffer day", note: "Catch up on anything skipped, or repeat a favourite spot" },
  ],
  tropical: [
    { title: "Nothing scheduled", note: "Hammock day — the trails will still be there tomorrow" },
    { title: "Slow village walk", note: "No itinerary — follow whatever path looks interesting" },
  ],
};
