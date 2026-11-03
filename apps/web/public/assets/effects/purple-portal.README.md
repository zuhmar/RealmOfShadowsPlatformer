# Purple smoke portal

Original glossy violet portal with eight looping animation poses: fixed gothic arch, pulsing amethyst doorway, and rising purple smoke. The palette matches the Realm of Shadows logo and HUD.

`purple-portal.png` is an unchanged 1536×1024 RGBA generated sheet, four columns and two rows. Each frame is 384×512, with the arch centered and the base at y444. Transparent surroundings and translucent smoke are retained. Full-cell atlas rectangles preserve the smoke; do not crop to only the opaque stone arch.

`purple-portal.json` is a Phaser JSON atlas with frames `idle-0` through `idle-7`. `purple-portal-animation.json` specifies an eight-FPS repeating loop and the base-aligned origin. At a 0.32 scale the complete frame displays about 123×164 pixels.

```ts
this.load.atlas('purple-portal', '/assets/effects/purple-portal.png', '/assets/effects/purple-portal.json');
// After loading:
this.anims.create({
  key: 'purple-portal-idle',
  frames: Array.from({ length: 8 }, (_, i) => ({ key: 'purple-portal', frame: `idle-${i}` })),
  frameRate: 8,
  repeat: -1,
});
this.add.sprite(portal.x, portal.y, 'purple-portal', 'idle-0')
  .setOrigin(0.5, 444 / 512).setScale(0.32).play('purple-portal-idle');
```

The live game loads this atlas and plays the loop for portals in both Elderwood Village and Whispering Woods. Sprites are anchored to the existing portal coordinates at scale 0.32, with destination labels above the smoke. Destinations, E/interact travel and server interaction range are unchanged.
