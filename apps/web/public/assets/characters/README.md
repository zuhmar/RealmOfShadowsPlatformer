# Citizen character artwork

New painted weapon variants and Mira are documented in [armed/README.md](armed/README.md). That pack includes both appearances with sword, bow, staff, and dagger animations, plus texture atlases. It is connected to the live renderer; ladders continue to use the original unarmed poses.

Original matching male and female starter Citizens: chestnut hair, sage tunics, cream cuffs, brown belts/trousers/boots. Unarmed; the attack row is a punch. Each sheet has 42 poses: six each for idle, walk, jump, climb, attack, hurt, and non-graphic death. Most poses face right; climbing uses a rear three-quarter view.

The PNG files preserve the generated originals byte-for-byte, including genuine RGBA transparency. The artwork does not follow perfectly uniform cell boundaries, so use the accompanying **Phaser JSON texture atlases**, not `load.spritesheet` with fixed cell dimensions. Atlas rectangles were measured from all 42 connected opaque silhouettes per sheet with four pixels of padding. Trim metadata places each pose in a 256×256 source frame with a foot baseline at y224. These are initial alignment values; body pivots and gait timing should be visually tuned during integration.

```ts
this.load.atlas(
  'citizen-male',
  '/assets/characters/citizen-male.png',
  '/assets/characters/citizen-male.json',
);
this.load.atlas(
  'citizen-female',
  '/assets/characters/citizen-female.png',
  '/assets/characters/citizen-female.json',
);
// Frames are named idle-0..idle-5, walk-0..walk-5, etc.
```

`citizen-animations.json` supplies suggested playback ranges and rates. Jump poses cover anticipation through landing and will need selection driven by actual physics, rather than an endlessly looping clip. Climb animation should pause while stationary. The unarmed attack needs equipment layering or a separate weapon animation before replacing sword combat artwork.

The game preloads these atlases for both male and female players. Idle, walk and attack follow server snapshots; incoming damage does not trigger a player hurt animation or interrupt movement/attacks; jump poses follow actual vertical velocity and landing; climbing follows the server's explicit ladder flag and pauses while stationary. A defeat event creates a short-lived cosmetic death sprite at the defeat position while the authoritative player immediately respawns. Equipped weapons select the matching armed animation sheet; unequipped Citizens use the supplied punch artwork.

Sage artwork is used unchanged. Ember and Tide variants recolor the olive cloth at runtime while preserving skin, hair, cuffs, dark outlines and transparency. Character creation, selection, HUD and stats portraits crop the same idle atlas frames. `npm run test:browser:characters` checks both appearances and all 72 active pose frames, the three outfit variants, jump selection, climb pause/resume, attacks continuing through damage, sword visibility, defeat/fade and mobile rendering. Original PNG files remain unchanged.

The unused hurt poses remain in the original artwork and metadata but are not registered or played by the player renderer. Wolf hurt animations are unchanged.
