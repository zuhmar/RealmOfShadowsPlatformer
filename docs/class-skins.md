# Class carousel and cosmetic skins

Claiming the Cavern Mentor’s class trial opens a class-selection popup. The carousel displays Knight, Archer, Mage and Rogue with their sprite, weapon, training and signature details. Use its arrows, left/right keys, slide indicators or a horizontal swipe. Escape/close allows choosing later. The mentor and Skills panel both provide a Browse classes button to reopen it. First class choice remains free; later changes still require a nearby mentor or Mira, cost 500 gold and refund talents.

Open Character → Change skin to switch freely among the original adventurer, Royal Knight, Woodland Ranger, Starlight Mage and Dusk Rogue. Skins are cosmetic, available independently of the chosen class and do not change gold, equipment, training or attributes. The first class choice suggests its matching skin only if no cosmetic choice has been made. Later class changes preserve the chosen skin. Cosmetic choices persist through saves and appear on the profile, character panel, character selection and other players’ screens.

Every class skin has male and female animation art. Knight includes a crested helmet, Archer a ranger hood, Mage a pointed hat and Rogue a hood. Pose-aligned headwear follows movement, attacks, jumping, climbing and defeat. Weapons keep their equipped tier artwork and tools keep their actual material. Climbing hides held items. Active player hurt animations remain disabled.

Skins, headwear and held-item atlases load on demand and use lossless optimized delivery copies. Sprite atlases retain their authored proportions and measured per-frame anchors. Skins use fixed class palettes; the original adventurer retains its existing sage/ember/tide outfit colors.

## Crystal platforms and proportional art

Crystal Caverns now has a dedicated six-piece terrain atlas with ledge modules, ground, ladder and dock artwork. The four existing map layouts and collision surfaces remain authoritative. Terrain strips repeat at a uniform scale and crop the last piece to the required width/height. Village platforms and ladders, Woods ground and ladders use the same approach where they previously stretched. Existing Woods ledges and fishing art already scale proportionally.

Background fitting now reads each loaded image’s real dimensions instead of assuming a common aspect ratio. Props, portal key markers and weapon effects also retain uniform image scale. Backgrounds may crop to cover the viewport; artwork is never stretched independently along an axis.

## Checks

- Unit checks validate skin IDs, eight complete bounded sprite atlases, sixteen headwear views, pose anchors and cosmetic independence.
- `node --env-file-if-exists=apps/server/.env --import tsx scripts/browser-class-skins.mjs` verifies the real quest claim popup, class selection, mobile carousel, skin switching and save/re-entry.
- `node scripts/browser-skin-rendering.mjs` checks all eight skins, animation loops, matching headwear, held weapons and tools, unarmed climbing and restoration of the original skin.
- `node scripts/browser-terrain-proportions.mjs` checks image/sprite scale across all nine playable maps in desktop/mobile viewports, background coverage and exact Crystal collision-surface coverage.
- Existing class/transaction, character, weapon, gathering, Crystal, Woods and village checks remain applicable.

Screenshots are saved under the ignored `artifacts/` directory. Mobile viewport checks use Chromium emulation.
