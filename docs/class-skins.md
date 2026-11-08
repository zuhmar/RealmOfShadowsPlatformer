# Class carousel and integrated class sprites

Claiming the Cavern Mentor’s class trial opens the class-selection carousel. It displays Knight, Archer, Mage and Rogue with sprite art, weapon, training and signature details. Arrows, left/right keys, slide indicators and horizontal swipes browse it. Escape/close allows choosing later; the mentor and Skills panel offer Browse classes. First class choice remains free; later changes cost 500 gold at a mentor/Mira and refund talents.

## Class-specific skins

Character → Change skin offers the original adventurer and the four class looks. Royal Knight requires Knight, Woodland Ranger requires Archer, Starlight Mage requires Mage and Dusk Rogue requires Rogue. The selector shows the required class and disables locked looks; the server also rejects forged cross-class skin requests. Civilian can use the original adventurer. Valid skin changes are free, cosmetic and do not alter equipment, training, attributes or gold.

Choosing/changing class selects its matching class look if a class skin was being used; an explicit original-adventurer choice stays original. Previously unrestricted saves with an incompatible class skin migrate to their matching class look, or to original for Civilian. Future cosmetic definitions can omit a required class; these four class skins require one.

## Integrated artwork

The current set contains 32 male/female sprite atlases under `characters/skins/integrated`: eight unarmed class bodies and 24 matching-class armed bodies covering starter, Woods and Crystal weapons. Knight uses a sword, Archer a bow, Mage a staff and Rogue a dagger. Helmets, hoods/hats and held weapons are authored directly into the character pixels in every frame. Combat and class-carousel previews do not attach separate headwear or weapon images.

Unarmed sheets contain idle, walk, jump, climb, attack and defeat poses; old hurt cells are unused. Armed sheets contain idle, walk, jump, class-appropriate attacks and defeat poses. Climbing switches to the unarmed integrated-headwear sheet. Gathering retains actual equipped tools through the existing tool renderer, on the headwear-integrated body. Higher-island class weapon sheets are future artwork; the existing original-adventurer weapon renderer remains available for those tiers.

Sprite sheets load on demand. Their atlas metadata measures source dimensions, baselines and animation-row boundaries; all rendered images retain uniform scale. The original source references remain for authoring and compatibility with already-loaded older clients. Optimized delivery uses quality-88 WebP copies with identical alpha bytes and original dimensions; source PNGs remain unchanged.

## Platforms and proportional art

All nine playable maps now use continuous ledge silhouettes and full-height ladder rails, baked at world scale without repeated complete chunks. Their existing collider dimensions and distinct layouts are preserved. See [cohesive terrain](cohesive-terrain.md). Backgrounds use real loaded-image dimensions and crop to cover the viewport; props, portal key markers and effects retain their proportions.

## Checks and art inspection

- Unit checks validate matching-class eligibility, free allowed changes, class-change behavior, legacy migration, all 32 bounded sprite atlases and integrated headwear/weapon metadata.
- `tests/skins.integration.ts` exercises server rejection, migration and durable cosmetic saves.
- `node --env-file-if-exists=apps/server/.env --import tsx scripts/browser-class-skins.mjs` checks the quest popup, class carousel, locked skins and save/re-entry.
- `node scripts/browser-skin-rendering.mjs` checks the eight class/appearance combinations across starter/Woods/Crystal weapons, animation loops, unarmed ladders, gathering and original-skin restoration.
- `node scripts/review-class-art.mjs` produces idle/attack contact sheets for visual inspection.
- `node scripts/browser-terrain.mjs` checks all nine maps on desktop/mobile viewports.

Generated raster files are copied unchanged. `scripts/frame-class-art.py` reads alpha bounds to create atlas metadata; it does not composite headwear or weapons onto characters. Screenshots go to ignored `artifacts/`. Mobile checks use Chromium emulation.

Atlas framing uses the dominant connected silhouette to exclude detached strips from neighboring rows while retaining detached arrows. Each class pose uses a fixed foot baseline and the sheet’s uniform 80-unit idle scale. Profile and carousel previews use that same scale rather than the generated cell size. `scripts/tighten-character-atlases.py` tightens the older adventurer, held-weapon and gathering atlas rectangles while preserving their virtual coordinates; source raster artwork remains unchanged. Runtime atlas sampling uses a half-texel inset to prevent linear filtering from reading the neighboring cell.
