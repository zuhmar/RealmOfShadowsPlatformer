# Four-area island progression

Every island is defined as three monster areas followed by a boss area in `ISLAND_AREAS`. This build implements Whispering Woods; later islands retain their planned status and will be built island by island.

| Map | Area | Monster | Forward portal |
| --- | --- | --- | --- |
| woods | Wolf Hollow | Wolf | Silkshade Glade |
| woods-2 | Silkshade Glade | Thorn Spider | Brambleboar Run |
| woods-3 | Brambleboar Run | Wild Boar | Forest Bear Den, consumes one Forest Bear Key |
| woods-boss | Forest Bear Den | Forest Bear | Return to Brambleboar Run |

Each area has its own world room. Forward portals stand at x2300/y760; return portals at x90/y760. Returning from a later stage puts the player near the corresponding right-side portal. The village connection and gathering platforms remain in Wolf Hollow. New areas reuse the established forest platforms, ladders and props, with original spider-glade, boar-run and bear-den backgrounds.

Wild Boars have a20% chance per eligible kill to grant one Forest Bear Key directly to the killer’s inventory. Failed rolls award no key. Duplicate hits on dead monsters cannot repeat rewards. The key uses original brass/emerald paw-and-leaf artwork in Bag and above the boss portal. Other players do not receive the killer’s key.

Boss entry requires standing at the third area’s portal with at least one key. All travel conditions are checked before mutation. One key is consumed on each entry and the destination plus inventory are saved before the travel message. Returning is free; reconnecting in an already entered boss room does not consume another key. The room removes the departing player before awaiting its save, preventing duplicate concurrent travel spending. Save failure disconnects the client so it can reconnect to durable state.

The new monsters have original16-pose sheets (idle, walk, attack, defeat, four frames each), plus a short idle-frame hurt reaction with tint. Atlas origins are measured per frame. Bear artwork was repaired to keep its entire swipe inside its cell and retain true transparency. Enemy stats, attack cooldowns, movement, gold and XP are defined in `monsters.ts`; original Wolf balance is preserved. Forest Bear defeats increment a persistent `bossKills` counter for later progression. Combat still uses the existing shared-world AI; Forest Bear respawns after45 seconds. Later island maps and their unlock rewards are not enabled in this build.

Tests cover the connected four-part route, all seven islands’ stage definitions, correct monster populations, proximity/key gates, one key consumed per entry, free return, key roll boundaries, duplicate reward prevention, persistent boss credit, all48 generated monster poses, background rendering on desktop/mobile, and live travel/save behavior.
