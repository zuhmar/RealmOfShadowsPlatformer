# Playable-island ladders and fishing ponds

Whispering Woods, Crystal Caverns, and Murkmire Swamp have generated traversal atlases under `assets/tilesets/traversal/`. The materials match each island's existing platforms: forest earth and warm gray stone, turquoise crystal and indigo rock, or purple-gray mudstone and mangrove roots. Future islands are not included.

Each atlas contains a complete clean ladder and one complete pond platform. Pond water is on the platform's upper surface with a short dock over its left half. All drawing preserves source proportions. Measured walking and water baselines align the dock, character, and fishing cast. Fishing starts from the dock position facing the pool; continuous gathering, skill requirements, yields, and tool rules are unchanged. Crystal and Murkmire's entry ladders align with the dock's left side.

Ladder rails repeat from a plain rail strip; only complete rungs are placed. Top and bottom caps extend through their landing surfaces. No ladder vines or dangling foliage are added. Terrain positions and combat routes otherwise remain unchanged.

Atlas metadata is bundled with the matching image references to avoid stale external frame coordinates. Each island loads one combined image for its ladders and pond. The prior unused ladder/dock atlases are no longer loaded for these islands. Original PNG art is retained and optimized delivery copies preserve dimensions and alpha.

Validation: `npm test`, `npm run build`, `node scripts/browser-island-traversal.mjs`, `node scripts/browser-terrain.mjs`, and `node scripts/browser-murkmire.mjs`. The traversal browser check covers dock standing positions, water cast coordinates, complete ladder landings, uniform scaling, and desktop/mobile captures for each playable island.
