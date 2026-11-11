# Larger furniture and item displays

Furniture is roughly 70% larger, using uniform image scaling. House coordinates,
existing pieces, recipe costs, and plot sizes are preserved. More space is needed
between newly placed larger pieces.

Inside your finished home, use Home → Decorate → Display loot & equipment.
Choose an eligible bag item or identified, unequipped gear, then tap a room
position and confirm with the existing direct-placement controls. Displays use
the actual item sprites on small wooden stands, not generic loot placeholders.

Placement transfers one item out of the bag. Return to bag reverses that
transfer. Equipment moves as an individual instance, preserving its ID, source,
rarity, identification state, and attribute rolls. Equipped items and unidentified
gear cannot be displayed. Displayed gear cannot be equipped from the bag until
retrieved. Invited guests can see displays but cannot remove them.

Raw displays are limited to resources/loot with supported artwork, smelted bars,
and supported weapons/armor. Recipe scrolls, food/potions, and gathering tools
are not part of this display catalog. New resources should add their display
art mapping before becoming selectable. House capacity includes displays.

Oak chests remain decorative. This change does not add a chest inventory or
shared storage interface.

Validation: `tests/house-displays.test.ts` covers sizes, preview non-mutation,
item transfer/retrieval, exact gear round trips, ownership, equipped/unknown
rejection and floor-specific collision. `scripts/browser-house-displays.mjs`
uses a temporary account with the real server/database to place loot and gear,
retrieve the same rolled equipment, and check saved re-entry. The shared
multiplayer housing suite continues to cover privacy, guests, floor traversal,
revocation and persistence. Temporary screenshots stay in ignored artifacts/.
