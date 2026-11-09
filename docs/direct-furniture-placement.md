# Direct furniture placement

Inside your own finished house, open Home → Decorate and choose a furniture
item. The menu closes to reveal a world-space preview. Move the mouse or tap
inside the current room to choose a spot, then press Place furniture. A green
outline indicates a valid spot; red explains why placement is unavailable.
Cancel placement or Escape leaves inventory unchanged. Climb to another floor
before starting placement there. The door does not exit the house while a
placement preview is active.

The numeric position slider is removed. Furniture remains saved as the same
floor and horizontal offset, so existing houses and furniture are preserved.
The preview and server share `furniturePlacement` validation; the server still
checks ownership, inventory, floor, wall bounds, capacity and overlap. Inventory
is consumed only by the successful server save, not by previewing. Controls and
chat temporarily hide while decorating, and return afterward. Confirmation waits
for a housing revision acknowledgment before closing.

Validation covers desktop clicking, touchscreen placement, cancellation,
overlap rejection, door interaction, plot upgrades, and saved furniture on
re-entry through `scripts/browser-housing.mjs`, plus shared placement unit tests
and the multiplayer housing integration test. Preview screenshots are generated
in ignored `artifacts/furniture-preview-{desktop,mobile}.png`.
