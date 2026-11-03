# Guardian markers and upper boss entrances

Each island has one distinct generated guardian prop, serving as the clickable, key-gated boss portal itself:

| Island | Guardian prop |
| --- | --- |
| Whispering Woods | Carved oak Forest Bear Totem |
| Crystal Caverns | Cyan Crystal Wyrm Obelisk |
| Murkmire Swamp | Three-headed Hydra Root Idol |
| Frostfall Tundra | Frozen Frost Giant Cairn |
| Ember Peaks | Infernal Drake Brazier |
| Celestial Realm | Winged Fallen Seraph Shrine |
| Shadow Fortress | Obsidian Shadow Dragon Altar |

The seven original1254×1254 RGBA PNGs are in `public/assets/props/boss-entrances/`. The manifest contains measured alpha128 silhouette bounds and bottom-center origins. PNG bytes are preserved. `boss-entrances.ts` draws each prop at its catalog height and loads only the theme needed by the current map. A browser gallery verifies all seven assets; future islands remain planned content.

Whispering Woods’ third area places its boss portal at x2240/y285 and its interactive totem at the same x2240/y285, on boss-perch (x1920–2360), the highest platform in that map. Climb the ladder at x1740 from ground to boar-rise, cross to x1980 and climb again to reach the perch. The totem replaces the swirling boss portal; normal area portals retain their island vortex. Click the totem or use Interact nearby. Wild Boar key drops and one-key-per-entry consumption are unchanged. Returning from the den restores the player to boss-perch, preserving altitude and grounded platform identity.

Each hunting map has a different collision layout and separate monster/prop placements. Wolf Hollow keeps its gathering platforms. Silkshade Glade uses branching canopy terraces; Brambleboar Run uses ascending banks; Forest Bear Den uses a broad arena floor and asymmetric ledges. Tests validate unique geometry, spawn support, both endpoints of each ladder, actual climbing simulation, reachability, top-perch placement, and refusal to spend keys from ground below the entrance.

For a later island, use its `ISLAND_AREAS.bossEntranceTheme` and set `map.bossEntrance` at its keyed portal’s coordinates on the highest reachable platform. The six future guardian sprites are ready; those island maps are not enabled by this change.
