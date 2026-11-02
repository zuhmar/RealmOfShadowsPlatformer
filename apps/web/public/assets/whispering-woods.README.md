# Whispering Woods environment art

A coordinated original flat glossy cartoon kit for Realm of Shadows:

- One opaque 1536×1024 forest panorama, with a quiet central clearing and layered tree silhouettes.
- Four transparent terrain sprites: ground, wide/medium/small floating platforms.
- Two transparent wooden ladders: six-rung short ladder and ten-rung tall ladder.
- Twelve transparent props: moss boulder, stump, hollow log, fern, bush, mushrooms, blank trail sign, lantern post, spiral waystone, chest, berry bush, and stone arch.

PNG files preserve the generated artwork byte-for-byte. Platforms/ladders live in `tilesets/`, props in `props/`, and the backdrop in `backgrounds/`. Each cutout sheet has a Phaser-compatible JSON texture atlas with named, measured frame rectangles. Bounds were detected from connected opaque silhouettes with four pixels of padding; the PNG transparency and all eighteen sprite regions were checked. The atlas coordinates do not assume uniform cells.

`maps/whispering-woods-art.json` lists paths, frame names, sizes, and initial platform-surface alignment hints. It is an **art manifest**, not a playable map or collision definition. Load the atlas pairs with `this.load.atlas(...)`, and the background with `this.load.image(...)`.

The panorama is one flattened image, not a seamless repeating tile or independently exported parallax layers. The renderer fits it without stretching and applies a small camera-relative drift, including on resize and zoom. Platform grass tops align to the existing collision surfaces through the manifest surface offsets. Ladders fit the existing climb endpoints, with no new physics bodies. A dark soil backfill extends below the ground art for tall/zoomed-out viewports. Platform pieces and full ladders are standalone sprites; no seamless tiling or nine-slice rendering is used. Props are artwork only: a chest has no opening animation or loot interaction, and the sign has no assigned destination.

The live Wolf Hollow scene now uses these assets. Elderwood Village retains its own placeholder scenery. All twelve prop types appear as decorations behind characters and monsters; they do not add collisions or interactions. Existing platform collision, ladder navigation, portals, monster spawns and rewards are preserved. Run `npm run test:browser:woods` to check all atlas loads, surface alignment, ladder/prop counts and background coverage across map edges, canopy and mobile views.
