# Wolf sprite sheet

Original flat glossy cartoon wolf artwork generated for Realm of Shadows. Transparent PNG: 1374 × 1145 pixels, a 6-column × 5-row grid of 229 × 229 pixel cells. All frames face right.

Rows: idle, walk, bite attack, hurt, death (six frames each). `wolf-spritesheet.json` records suggested Phaser frame ranges and playback rates.

The Phaser scene preloads the sheet and metadata. Server snapshots select idle/walk loops and trigger attack/hurt/death clips on state changes. Dead wolves finish the fall, fade out, and reappear at server respawn. Facing follows actual movement or the nearby attack target. Per-frame foot baselines measured from the opaque artwork keep the paws aligned without modifying the source PNG. Timing is cosmetic; combat and rewards remain server-authoritative.
