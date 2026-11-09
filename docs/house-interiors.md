# Private enterable houses

A finished house has a clickable front-door area at the center of the Elderwood housing platform (x900/y240). Approach within 100 horizontal/65 vertical units and click the house, press Interact/E, or choose Enter house in Home. Unfinished plots stay outside. Interior travel uses normal durable saves, authenticated room reservations and the same canvas/renderer handoff as world travel. It consumes no Teleport Crystals.

| Plot   | Interior width | Floors | Furniture capacity |
| ------ | -------------: | -----: | -----------------: |
| Small  |          1,000 |      1 |                 24 |
| Medium |          1,450 |      2 |                 48 |
| Large  |          2,000 |      3 |                 80 |

Rooms have continuous collision floors and ladders connecting every level. Move, jump, climb, and drop through upper floors using the normal controls. The ground-floor exit door returns to the outdoor house position in Elderwood. Walk near the door before clicking Exit/Interact. Plot upgrades remain an outdoor action, preserving existing furniture and construction; a larger house automatically has more room and floors on next entry.

## Decoration

Home → Decorate places an owned furniture item on the floor the owner is standing on. The horizontal slider spans the interior's usable width; Place here sets it to the player's current position. The server derives floor from actual grounded position, enforces room bounds, capacity, inventory and collision with other furniture on that floor. Different floors can use the same horizontal position. Only the owner can change the house. Removal returns the furniture to inventory.

Existing furniture is preserved: an absent floor field means ground floor. Old horizontal positions are relative to room center and fit the new wider rooms. Furniture is rendered inside rather than on the outdoor village platform. Existing house ownership, blueprints, construction, batch crafting, equipment and combat rules are unchanged.

## Privacy, invitations and persistence

Rooms are filtered by both map ID and house owner ID. Two owners with the same plot size never share an interior. Join authentication validates the saved destination, owner, finished house size and owner/invitation membership. The client cannot join an arbitrary house by supplying its owner ID. Guest snapshots contain only a sanitized house view; owner's inventory and invitation lists remain private.

The Guests tab lists finished houses whose invitation list contains the viewing character, including owners who are inside or offline. The list exposes only authorized owner IDs/names. Selecting a house revalidates permission and previews its exterior, then invited visitors can enter through the front door. Village selected visits also remain available as the owner enters the house. In an occupied interior, owner edits publish immediately. When the owner is elsewhere, persisted owner state is refreshed once per second. Revocation, house deletion or incompatible upgrades send guests outside. Offline visitors whose house access has ended are restored to Elderwood on the character-list refresh, preventing an unusable saved destination. Saved owners can log back into their house and retain furniture on all floors.

House actions keep the existing serialized, locked, revision-checked save path. Runtime selected views are never written into character JSON. Saved `houseOwnerId` records private destination ownership; no database schema migration is required. Ordinary legacy world travel still uses its compatible string messages.

## Art

Generated `props/house-interiors.{png,json}` has six cutout sprites: plaster/wood wall panel, floor slab, support beam, full ladder, exit door and purple-curtain window. Original: `/workspace/generated_images/exec-d8f7d92a-a71c-4ecd-bd7a-a99889f12685.png`. Original PNG bytes remain unchanged. Metadata isolates each asset; tiled surfaces and uniformly scaled fixtures preserve proportions. Wood backing connects tile seams; ladder hatches mark openings. Existing generated furniture sprites are reused. The delivery WebP retains exact alpha/dimensions.

## Verification

Unit tests cover increasing map/floor/capacity sizes, ladder connectivity and actual climbing, ownership, interior-only placement and floor-specific overlap. The multiplayer housing integration covers entry/exit reservations, owner/guest sharing, independent owners' room isolation, denied invitations, real walking/climbing and placement on upper floors, guest edit rejection, revocation ejection, re-entry and atomic batches. Browser checks render all three layouts and floor furniture on desktop/mobile; the actual housing UI builds, enters, decorates, exits and upgrades.

Run typecheck/unit/build, `npm run test:integration`, `node scripts/browser-house-interiors.mjs` and `node --env-file-if-exists=apps/server/.env scripts/browser-housing.mjs` with local services running. Screenshots remain under ignored artifacts.
