# Base Celestial weapon sheets

The plain white-and-gold body visibly holds starter, Woods and Crystal swords, bows, staves and paired daggers. Twelve sheets contain 432 frames: six poses each for idle, walk, jump, basic attack, skill and death. Weapon design follows equipped equipment rather than the current map. Civilians can preview all four weapons before choosing a class; no combat rules change.

`baseSkinSheet` selects these assets for explicit golden-test or civilian appearances. Climbing, gathering and unarmed states use the existing golden-test sheet; gathering retains the equipped tool overlay. Armed sheets suppress the separate weapon overlay. Unsupported future tiers keep the existing overlay fallback. Portraits remain unarmed; the bare-body skin picker can preview the equipped weapon.

`base-armed/manifest.json` records source originals and clips. `scripts/frame-base-weapons.py` copies source PNGs unchanged and derives foot-aligned atlas bounds. Optimized delivery copies preserve dimensions and exact alpha. Source artwork stays under `/workspace/generated_images`.

Validation: typecheck, unit tests, production build, `scripts/browser-base-weapon-sheets.mjs` and `scripts/browser-base-weapons.mjs`. The browser checks cover every sheet and clip, actual equipment selection, paired dagger metadata, climbing, held gathering tools, and desktop/mobile rendering.
