# Celestial class sheets

Eight approved-colorway character sheets: Knight steel/blue, Archer green/brown, Mage blue/silver, Rogue charcoal/brown/burgundy. Exposed faces and hands stay featureless white with restrained gold edging; clothing is not emissive.

Each PNG contains 36 poses, six columns and six rows. Use the matching JSON atlas, not equal-cell slicing: generated spacing differs slightly between poses, and the atlas excludes detached gutter noise. Metadata contains animation clips, foot-aligned trim geometry, display scale and estimated hand anchors for later tool attachment.

| Variant | Rows, top to bottom |
| --- | --- |
| Unarmed | idle, walk, jump, climb, attack, death |
| Armed | idle, walk, jump, attack, skill, death |

Every row has six frames. Idle/walk/climb loop; attack/skill/death play once. Jump frames map to launch/rise/apex/fall/landing as usual. No hurt animation. Climbing uses unarmed artwork. Armed weapons are drawn into the character: Knight sword, Archer bow, Mage staff, Rogue **two daggers**. These are base class weapon designs; island-specific weapon variants are not included in this batch. A `dual-daggers` label is visual metadata, not a new server equipment slot or balance change.

`manifest.json` records every sheet, its generated original source filename, variant, weapon and clip names. Originals remain under `/workspace/generated_images`; PNGs are copied unchanged. Regenerate crop metadata using `python scripts/frame-celestial-classes.py jobs.json`, where jobs contains `{ "id": "knight-unarmed", "path": "/workspace/generated_images/<source>.png" }` entries for all eight sheets. `python scripts/optimize-art.py --verify` creates delivery copies with exact alpha and dimensions.

`node scripts/browser-celestial-sheets.mjs` loads all eight atlases in Phaser and verifies playback of every frame in all 48 clips. Screenshots go under ignored `artifacts/`.

The artwork and metadata are ready for integration. This asset batch does not switch the live player renderer or class selector to these outfits yet; current hero/NPC visuals remain active until wiring is requested.
