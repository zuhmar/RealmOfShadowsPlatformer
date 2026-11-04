# Playable alpha polish

Completed scope: Crystal Caverns first; the remaining five islands stay planned.

- Players remain Civilian through Whispering Woods. Claim the Cavern Mentor’s Crystal Caverns class quest for a free first choice; later changes cost 500 gold and refund talents.
- Three class talent branches; Melee/Magic/Distance affect base damage only. Gear supplies attributes.
- Four Crystal maps with unique platform layouts, 10/10/10/1 monsters, resources, generated sprites, held Crystal tools, quests 90/120/180/1 and a keyed upper boss entrance.
- Double-sized Crystal Wyrm with basic attacks and an animated, telegraphed eruption. One key consumed per entry.
- Offline discovered-area hunting/gathering with atomic eight-hour capped claims.
- Damage tuning, lazy outfit recoloring, private progression snapshots, unexpected-disconnect recovery and device-persisted sound controls.

Verification: 106 unit tests; ten database/network integration tests; typecheck and production build; Crystal desktop/mobile rendering; character, island-weapon and gathering animation regressions; real browser reconnect preserving the canvas, confirmed exit, and audio lifecycle/settings checks. A local 24-client room measured 94.82 ms p95 update interval and 29,217 average snapshot bytes.

Automated mobile viewport rendering and a short local room load test do not establish physical-phone performance or production capacity. Those remain release validation tasks.
