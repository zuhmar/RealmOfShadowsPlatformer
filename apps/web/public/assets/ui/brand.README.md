# Realm of Shadows interface theme

The supplied purple castle-and-lettering logo is the brand reference. `realm-of-shadows-logo.png` is a generated transparent preparation of that reference, retaining the title, spires, bats, and purple glow. It appears in the header, landing hero, and login/registration dialogs. The original inline upload is not available as a byte-for-byte workspace file.

`/assets/backgrounds/shadow-realm-login.png` is an original opaque 1536×1024 night-castle illustration with a distant Shadow Dragon and negative space for the login content. It changes the landing artwork, not the playable village or woods scenery.

The coordinated transparent sprite sheets use deep violet, lilac highlights, and near-black plum outlines: `player-menu.png` (3 icons, 2172×724), `world-actions.png` (4 icons, 1254×1254), and `game-controls.png` (12 icons, 1536×1024). Their JSON frame rectangles were remeasured from the new artwork. PNGs preserve the generated source bytes. Runtime SVG cropping uses those rectangles rather than assuming a uniform grid.

CSS carries the same palette into HUD panels, portraits, MP/XP bars, chat, menus and login controls. HP retains its damage-readable warm color. In-game buttons remain transparent without backplates; keyboard focus and Auto's active indication remain visible. All gameplay controls and the mobile layout are retained.
