# Cohesive platforms and ladders

Elderwood Village and all four areas of both Whispering Woods and Crystal Caverns use continuous terrain silhouettes instead of repeating complete platform/end-cap sprites. Woods ledges have moss crowns, earth strata and roots; village terraces use matching timber beams and braces; caverns use continuous mineral crust and rock faces. Fishing decks and pools share those materials. Ladders have uninterrupted rails, evenly spaced rungs and mounting straps at their actual top and bottom surfaces.

`apps/web/src/terrain.ts` builds these code-native illustrations at world scale and bakes them once into reusable textures. It does not stretch source artwork or tile finished platform shapes. The cache retains platform textures for three maps; ladder textures share matching biome/height keys. All generated textures disappear with the game instance. Existing PNG sources remain available for older clients and authoring. Woods no longer downloads its old platform, ladder and fishing atlas; Caverns no longer downloads its old platform atlas.

The platform/ladder collision graph, distinct hunting layouts, resource platforms, entrances and routes are unchanged. One terrain image corresponds to each existing platform collider and one ladder image to each existing route. Class fishing bobbers now use the same water position as original character fishing. Scenery listeners detach on scene destruction as well as shutdown, preventing old-map resize callbacks after travel.

Checks:

- `npm test` and `npm run build`
- `node scripts/browser-terrain.mjs`: all nine playable maps, desktop and 390×844 viewport, exact surfaces/widths, one continuous object per route, and screenshots under ignored `artifacts/terrain-*`.
- `node scripts/browser-woods.mjs` and `node scripts/browser-village.mjs`: scenery coverage, collider alignment and village interactions.
- `node scripts/browser-gathering-animations.mjs` and `node scripts/browser-skin-rendering.mjs`: held tools, fishing, class sprites and animation loops.
- `node scripts/browser-travel-cache.mjs`: repeated map changes with shared renderer/cache reuse.

Mobile checks use Chromium viewport emulation, not physical devices.
