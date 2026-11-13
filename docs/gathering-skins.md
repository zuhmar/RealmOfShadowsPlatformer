# Gathering artwork

Gathering uses 40 generated character-and-tool sheets: the base character and four class skins, each with wood, iron, crystal, mire, frost, ember, celestial and shadow tools. Each sheet contains four poses for each of mining, woodcutting, fishing and herbalism. Tools are painted into the hands in every frame; the renderer hides the separate equipment image.

Sheets load on demand for the active skin and equipped tool material. Metadata is bundled with the client so cached image versions cannot receive mismatched frame coordinates. Virtual foot anchors keep the character grounded; fishing line starts at each frame's rod tip. Climbing restores the unarmed character animation.

Generated originals remain untouched. `scripts/frame-baked-gathering.py` accepts a JSON list of `{skin, material, path}` and copies those PNGs while deriving atlas metadata. Inspect generated poses for tool orientation, clipping and body consistency before accepting a sheet. Correct artwork with image generation, then rerun framing and `scripts/optimize-art.py --verify`.

`npm run test:browser:gathering-skins` checks all 160 skin/material/activity combinations, animation playback, hidden tool overlays, climbing and mobile fishing. The atlas unit test verifies all 40 sheets and their frame bounds.
