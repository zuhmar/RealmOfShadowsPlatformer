# Island portals

Regular area portals are pure magical vortices with animated energy and particles, without stone arches, pillars, gates or pedestals. Seven original transparent RGBA sprite sheets live in `apps/web/public/assets/effects/island-portals/`. Each is1536×1024, laid out as eight384×512 frames in four columns and two rows, played at8 FPS in a repeating loop.

| Island | Theme |
| --- | --- |
| Whispering Woods | Emerald/lime energy and drifting leaves |
| Crystal Caverns | Cyan/turquoise energy and prismatic crystal light |
| Murkmire Swamp | Chartreuse/teal mist and bubbles |
| Frostfall Tundra | Ice blue/white frost and snowflakes |
| Ember Peaks | Red/orange flames and embers |
| Celestial Realm | Gold/ivory starlight with pale blue accents |
| Shadow Fortress | Violet energy and purple smoke |

The destination selects the theme. A return to Elderwood Village retains the source island’s theme. Thus both existing village/Woods portals are green; the purple theme is reserved for Shadow Fortress routes. Future island IDs are already mapped, while their existing availability and level gates remain unchanged.

`apps/web/src/portals.ts` loads only the themes needed by the current map and creates their animations. Original generated PNG bytes are preserved. The manifest stores measured per-frame origins using the energy silhouette at alpha128, keeping its center and base aligned as the vortex advances. Soft glow remains in the source frames. Portal collision/travel coordinates and labels remain unchanged. Legacy purple arch artwork is unused by the game.

Validation checks all seven atlas dimensions/frame bounds and island mappings. The portal browser check plays all56 frames in a gallery, renders the active Woods portals on desktop/mobile, and completes village→Woods→village travel.

Boss entrances now use the island guardian prop itself as the interactive keyed portal, replacing the vortex at that entrance. See `boss-entrances.md`.
