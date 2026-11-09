# Crafting bench artwork

The five coordinated sprites in `assets/props/crafting-stations.{png,json}` cover smelting, blacksmithing, Carpentry, Cooking and Alchemy. The source PNG is copied unchanged from `/workspace/generated_images/exec-9a129093-f952-4f9f-a63f-e7d9b91d5fa4.png`; generated alpha is preserved. Atlas bounds isolate each complete station; all display scaling is uniform with the feet on the actual platform surface. Optimized WebP delivery preserves dimensions and exact alpha.

Bram's area has a furnace at x825 and a blacksmith workbench at x990. Both open the existing Bram interaction and retain his proximity checks, recipes and material costs. The old duplicate anvil prop is removed. Cooking at x1360 and Alchemy at x1100 replace the former procedural placeholders, with larger hitboxes covering their sprites. Carpentry has a public workbench at x560/y240 on the housing platform; its click/Interact action opens the existing housing and furniture menu after server proximity validation. It is rendered as a station, never as an NPC figure. No profession, recipe, cost, physics collider or crafting output is added or changed.

Stations use a single village-only atlas and cached textures across travel. No ongoing bench animation or particle emitter is introduced.

Checks: typecheck, unit tests, production build, optimized-art alpha verification, `scripts/browser-crafting-benches.mjs` for all five sprites/baselines/hitboxes and desktop/mobile views, `scripts/browser-village.mjs` for existing scenery interactions, and `scripts/browser-housing.mjs` for a real server-validated Carpentry interaction and construction. Source originals stay in the generation directory.
