# Compass — AI Travel Planner (Phase 1 / MVP)

Compass is the "one stop shop" from the PRD: discover a destination by vibe, generate an editable itinerary, and track everything that's left to do before departure — in one place instead of three apps and a notes file.

This is the Phase 1 build per `docs/PRD_AI_Travel_Planner.md` §8: trip parameter stack, itinerary generation, and the tracker, against a curated destination/vibe fixture set. **Deliberately not in this build** (see the PRD roadmap): the deal optimizer / holiday-calendar import, the international legal & documentation module, live booking integration, and auth. Those are Phase 2/3, and the architecture below is shaped so adding them is additive, not a rewrite.

## Architecture

**Backend-centric, on purpose.** The front end fetches, renders, and sends user actions back — it does not generate itineraries, compute tracker progress, detect preference conflicts, or rank/filter data. All of that lives in `backend/`. If you're looking for "where's the logic," it's never in `frontend/`.

```
compass/
  backend/    Node + Express API. See backend/src/app.js for the module registry.
  frontend/   React (Vite). Render-only — see frontend/src/api/client.js.
  docs/       Copy of the product PRD this build implements.
```

### Backend — plug-and-play modules

Each domain module (`backend/src/modules/<name>/`) is self-contained: its own routes, service, and data/model files. Wiring a module into the API is one line in `backend/src/app.js`'s `MODULES` array — nothing else has to change. This is the seam a Phase 2 module (international documentation, deal optimizer) plugs into.

- `vibes` — the curated vibe taxonomy (beach/snow/city/tropical), each tagged with a creature + motif identifier the front end uses to render it. **The backend decides which vibe/creature a destination gets; the front end only decides how that vibe looks.**
- `destinations` — curated fixture set + fuzzy name search (`core/fuzzyMatch.js` is a generic utility, not destinations-specific — reusable anywhere else in the product that needs "did the user's text mean this record").
- `trips` — the core aggregate. In-memory repository (`trips.repository.js`) behind a small function surface, so swapping in a real database later doesn't touch the service layer above it.
- `preferences` — traveler roster, dietary needs, must-see list; flags (doesn't silently drop) a hard dietary constraint the current itinerary has no match for.
- `itinerary` — rule-based day/slot generator from curated templates, with buffer/rest days once a trip runs longer than its destination's templated days. The generator function is isolated so a later LLM- or live-API-backed version is a drop-in replacement.
- `tracker` — auto-seeds categories/items at trip creation (not from a legal-requirements engine — see the code comment in `tracker.templates.js` about what that seed content is and isn't), supports custom items/categories, computes progress server-side.

Validation is via `zod` schemas per module; errors are typed (`AppError` subclasses) and rendered consistently by one error-handling middleware.

### Frontend — render only

- `design/tokens.css` + `design/vibePalette.js` — the approved Vibe Kit design system, ported from the design-review artifact almost verbatim (fonts are self-hosted in `public/fonts/` instead of base64-inlined, since this is a real multi-page app).
- `assets/icons/creatures.js` / `motifs.js` — the creature/motif SVGs, ported verbatim from the same source.
- `components/` — presentational pieces (scene hero, trip window card, preferences panel, itinerary day card, tracker panel). They call the functions in `api/client.js` and render whatever comes back; none of them compute progress %, rank results, or generate content themselves.
- `pages/` — `NewTripPage` (browse by vibe, search, create a trip) and `TripDashboardPage` (preferences → itinerary → tracker for one trip).

## Running it

```bash
npm install          # from compass/ — installs both workspaces
npm run dev          # runs backend (:4000) and frontend (:5173) together
```

Or separately: `npm run dev:backend` / `npm run dev:frontend`.

Backend tests: `npm test` (from `compass/backend`, or `npm run test --workspace backend` from `compass/`) — `node --test`, no extra runner needed.

## Known gaps (intentional, not oversights)

- No auth — single trip by id, no accounts. Fine for Phase 1 validation, not for a real launch.
- No persistence — trips live in memory and reset on server restart. The repository-pattern seam in `trips.repository.js` is exactly where a real database plugs in.
- 12 curated destinations across 4 vibes. This is the ops-curated seed the PRD's OQ-2 describes, not a scale answer — see the PRD for the curated-vs-LLM-inferred tradeoff.
- Tracker "documents" items are generic reminders, explicitly labeled as such in the seed data — not the Phase 2 legal/visa-requirements engine.
