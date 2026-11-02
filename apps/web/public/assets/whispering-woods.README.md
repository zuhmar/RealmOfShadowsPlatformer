# Whispering Woods environment art

A coordinated original flat glossy cartoon kit for Realm of Shadows:

- One opaque 1536×1024 forest panorama, with a quiet central clearing and layered tree silhouettes.
- Four transparent terrain sprites: ground, wide/medium/small floating platforms.
- Two transparent wooden ladders: six-rung short ladder and ten-rung tall ladder.
- Twelve transparent props: moss boulder, stump, hollow log, fern, bush, mushrooms, blank trail sign, lantern post, spiral waystone, chest, berry bush, and stone arch.

PNG files preserve the generated artwork byte-for-byte. Platforms/ladders live in `tilesets/`, props in `props/`, and the backdrop in `backgrounds/`. Each cutout sheet has a Phaser-compatible JSON texture atlas with named, measured frame rectangles. Bounds were detected from connected opaque silhouettes with four pixels of padding; the PNG transparency and all eighteen sprite regions were checked. The atlas coordinates do not assume uniform cells.

`maps/whispering-woods-art.json` lists paths, frame names, sizes, and initial platform-surface alignment hints. It is an **art manifest**, not a playable map or collision definition. Load the atlas pairs with `this.load.atlas(...)`, and the background with `this.load.image(...)`.

The panorama is one flattened image, not a seamless repeating tile or independently exported parallax layers. The platform pieces and full ladders are standalone sprites; seamless tiling and nine-slice borders have not been verified. Fit them to existing map collision and ladder endpoints during integration, and visually check scaling/top alignment. Props are artwork only: a chest has no opening animation or loot interaction, and the sign has no assigned destination.

This commit saves the assets and their metadata. The live Whispering Woods renderer still uses its existing code-drawn scenery until the new art is wired in. No collision, navigation, monster, portal, or reward behavior is changed by these files.
