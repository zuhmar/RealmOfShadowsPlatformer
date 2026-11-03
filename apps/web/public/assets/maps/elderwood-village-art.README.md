# Elderwood Village artwork

Original woodland village kit matching the existing Whispering Woods palette and flat glossy cartoon style. This pack contains artwork and atlas metadata; the current village renderer is not changed by adding it.

| Asset | PNG dimensions | Frames |
| --- | --- | --- |
| `/assets/backgrounds/elderwood-village.png` | 1536×1024, opaque RGB | Background with distant rooftops and a clear central play area |
| `/assets/props/elderwood-village-buildings.png` | 1254×1254, RGBA | `guide-cottage`, `blacksmith`, `inn`, `market-stall` |
| `/assets/tilesets/elderwood-village-platforms.png` | 1536×1024, RGBA | `grass-ground`, `timber-terrace`, `stone-walkway`, `wooden-bridge` |
| `/assets/props/elderwood-village-props.png` | 1536×1024, RGBA | `barrel`, `crate`, `bench`, `lantern-post`, `well`, `training-target`, `anvil`, `noticeboard`, `shrub`, `flower-planter`, `signpost`, `ladder` |

Every sprite sheet has a matching Phaser JSON hash atlas at the same path with a `.json` extension. `elderwood-village-art.json` lists all paths and frame names. Use the atlases rather than fixed grid cuts: generated spacing is approximate. Rectangles were measured from all twenty connected opaque silhouettes, with four pixels of padding. Cutouts have genuine alpha transparency; PNG files preserve the generated originals unchanged.

```ts
this.load.image('village-background', '/assets/backgrounds/elderwood-village.png');
this.load.atlas(
  'village-buildings',
  '/assets/props/elderwood-village-buildings.png',
  '/assets/props/elderwood-village-buildings.json',
);
// Example placement after loading:
this.add.image(500, 650, 'village-buildings', 'guide-cottage').setOrigin(0.5, 1);
```

Buildings and props use front-facing elevations and transparent surroundings; the forge, baskets, and signs are part of their building silhouettes. The background has scenery only, with no solid collision floor. Platform pieces are decorative side-view strips, not verified seamless tiles. Their edges, scale, top alignment, and overlaps need tuning when integrated; retain the map's authoritative collision geometry. Use the standalone ladder over the existing ladder interaction and keep NPC labels, quest markers, and portal interaction areas unobstructed.

The village remains a peaceful woodland setting. This pack adds no new story claims about the protagonist's destroyed hometown.
