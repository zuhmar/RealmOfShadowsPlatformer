# Citizen character artwork

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

These files add artwork and atlas metadata only. They are not connected to the live player renderer or character-selection portraits yet. Real-time animation playback, mobile rendering, and final loop quality have not been tested for these character assets.
