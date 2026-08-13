// The plug-and-play seam: every domain module (vibes, destinations, trips,
// preferences, itinerary, tracker — and whatever ships in Phase 2/3, e.g. a
// legal/documentation module or a deal optimizer) exports { basePath, router }
// from its routes file. Wiring a new module into the API is one array entry
// here, not a change to every existing module.
export function registerModules(app, modules) {
  for (const mod of modules) {
    if (!mod?.basePath || !mod?.router) {
      throw new Error(`Module is missing basePath/router: ${JSON.stringify(Object.keys(mod || {}))}`);
    }
    app.use(mod.basePath, mod.router);
  }
}
