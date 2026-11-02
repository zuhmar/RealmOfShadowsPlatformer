# Armed Citizen artwork

Male and female starter Citizens, each holding one Elderwood trial weapon: sword (Knight), bow (Archer), staff (Mage), or dagger (Rogue). These are separate painted character-and-weapon sheets; the grips and attack poses include the weapon in the artwork.

Each PNG has six columns and six animation rows: idle, walk, jump, climb, attack, death. Each row contains six poses. There is no player hurt row. Sword attacks swing, bows nock/draw/release, staves cast, and daggers stab/slash. Jump poses cover crouch, ascent, apex, descent, landing, and recovery. Climbing uses a rear view and an implied ladder, with no ladder painted into the character sheet.

Use the matching Phaser JSON atlases, not fixed-size spritesheet cuts: generated spacing is approximate. Frame names are `idle-0` through `death-5`. Atlas rectangles follow measured opaque silhouettes with four pixels of padding. The original transparent PNGs are copied unchanged. Source frames use a 384×384 canvas with a bottom baseline at y336; initial horizontal alignment centers each complete silhouette. Weapon reach changes the silhouette width, so body pivots, playback timing, and transitions still need visual tuning during integration. Death frames use the same baseline and need floor alignment when integrated.

The bow sheets include an arrow during preparation/draw only. Flying arrows, magic projectiles, collision, and damage remain game systems. Mirror right-facing artwork for left-facing characters. Pause climbing when stationary and select airborne jump poses from physics rather than looping the full jump row.

These assets are prepared for integration. The current renderer still uses the original unarmed Citizen atlases and procedural weapon overlays; adding this pack does not switch the live character renderer. Outfit recoloring also needs review against the new weapon colors before integration.

The matching standalone weapon atlas is `/assets/equipment/elderwood-weapons.{png,json}` with frames `sword`, `bow`, `staff`, and `dagger`. Mira's six-frame idle/greeting atlas is `/assets/characters/mira.{png,json}`. Mira uses a 768×768 source frame and baseline y700; the weapon atlas uses the same source size for storage, and each weapon should be scaled to its intended UI or world size independently.
