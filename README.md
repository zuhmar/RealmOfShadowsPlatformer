# Realm of Shadows · First Light

A browser-based shared-world idle platformer. Elderwood Village, all four Whispering Woods areas, and all four Crystal Caverns areas are playable. Features include gathering, crafting, identifiable monster equipment, animated bosses, weapon-themed skills, quest-unlocked classes and talents, offline hunting/gathering, reconnect recovery, chat and PostgreSQL saves. Later five islands remain planned.

## Run locally

Use **Node 24** and Docker (or an existing PostgreSQL 16+ database). From this checkout:

```sh
# Alternatively, bash scripts/setup.sh performs these steps and checks readiness.
npm ci
cp apps/server/.env.example apps/server/.env
# Development-only credentials; never use this password for a public database.
docker run -d --name realm-postgres \
  -e POSTGRES_USER=realm -e POSTGRES_PASSWORD=realm -e POSTGRES_DB=realm \
  -p 127.0.0.1:5432:5432 -v realm-postgres-data:/var/lib/postgresql/data postgres:16-alpine
npm run db:generate
npm run db:migrate
npm run dev
```

If the container already exists, use `docker start realm-postgres` instead. Database data lives in the named Docker volume. The web client runs on port **5173** and the server on **2567**. Open the web client locally. `npm run db:migrate` is repeatable and uses Prisma's migration history; it never resets the database. To stop local services, stop `npm run dev` and use `docker stop realm-postgres`.

For a separately hosted database, set `DATABASE_URL` in `apps/server/.env` and skip Docker. Preserve TLS certificate verification; use the provider's documented SSL parameters and CA. The example database credentials are local development values, not secrets for deployment.

### Environment variables

| Variable          | Location                                 | Purpose                                                                                                               |
| ----------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`    | Server only, required                    | PostgreSQL connection string. Never expose to Vite.                                                                   |
| `PORT`            | Server, default `2567`                   | HTTP and WebSocket listening port.                                                                                    |
| `WEB_ORIGIN`      | Server, default `http://localhost:5173`  | Exact allowed browser origin, used for HTTP CORS and WebSocket admission.                                             |
| `VITE_SERVER_URL` | Web build, optional in local development | Public backend HTTPS origin. Defaults to the current hostname, port 2567. Must be HTTPS when the frontend uses HTTPS. |
| `TEST_SERVER_URL` | Integration tests, optional              | Server URL; default `http://localhost:2567`. Use an isolated test database/server.                                    |
| `CHROMIUM_PATH`   | Browser checks, optional                 | Installed Chromium path; cloud default `/usr/bin/chromium`.                                                           |

The guest session token is stored in browser local storage and the database stores only its SHA-256 hash. Guest sessions expire after **30 days**. A guest who clears site storage or loses the token cannot recover that guest account. Upgrade with **Protect your progress** before expiration; characters retain their IDs and progress. Registered accounts can log in again to obtain a new 30-day session. Expired session cleanup and abandoned guest-data deletion are not scheduled in this milestone.

## Play

1. Play as guest or log in, create an adventurer, and enter Elderwood Village.
2. Follow Mira’s trials through Wolf Hollow, Thorn Tangle, the boar area and Forest Bear. Try all four starter weapons as a Civilian.
3. Defeat the bear and reach level 11 to enter Crystal Caverns from the village’s upper terrace.
4. Complete and claim the Cavern Mentor’s bat trial to unlock your first free class choice. Later changes cost 500 gold and refund talents. Civilian characters do not train Melee, Magic or Distance.
5. Explore the three Crystal hunting areas and spend one key per Crystal Wyrm entry. Boss quests always require one kill.
6. Leave using the in-game exit for save confirmation. On character selection, assign offline hunting or gathering in a discovered area, then claim capped rewards once.

| Input                        | Action                                                             |
| ---------------------------- | ------------------------------------------------------------------ |
| A / D or left / right arrows | Walk                                                               |
| Space                        | Jump                                                               |
| W / S or up / down arrows    | Climb a nearby ladder                                              |
| Down + Space                 | Drop through an upper platform                                     |
| J                            | Basic melee attack                                                 |
| K                            | Weapon skill: 12 MP, 5-second shared cooldown, up to three targets |
| E                            | Travel through a nearby portal                                     |

Mobile has held direction, climb, jump, and attack buttons, plus the same skill/AUTO hotbar. Item details support keyboard focus and touch. Sound effects and optional ambient music have device-persisted volume and mute settings. Audio unlocks after a tap or key press.

## Validate

```sh
npm run typecheck
npm test
npm run build
# Start the database and server first:
npm run test:integration
# Start both server and web first; requires Chromium:
node scripts/browser-check.mjs
node scripts/browser-game.mjs
# Wolf animation lifecycle (web server only; no database required):
npm run test:browser:wolf
# Character animation lifecycle (web server only):
npm run test:browser:characters
# Whispering Woods artwork alignment and responsive coverage:
npm run test:browser:woods
```

The integration tests create and remove their own test users. They require the matching schema and should target an isolated development database. They exercise real HTTP requests, two Colyseus clients, authentication failures, forged input, shared combat, manual override, chat, saves/re-entry, offline double-claim prevention, and guest upgrade. The browser journey creates and removes its own guest, walks through the actual portal, hunts, opens inventory, sends chat, tests mobile manual override, and leaves/rejoins.

Browser captures go into ignored `artifacts/`. Assertions and game-logic tests stay in the repository. There is no claim of production load testing, mobile-device hardware testing, or a fresh cloud snapshot restoration test.

## Mira’s first trial and story

The hero is the boy who alone survived the Shadow Dragon’s attack on his hometown. After years of training, he begins the journey to slay it. See [the story foundation](docs/story.md); `STORY` and `QUESTS` in game-data supply the opening and dialogue.

In Elderwood Village, approach **Mira** on the village path and press **E**, click her, or use the **Interact** hotbar button. Accept **The first trial**, travel to Wolf Hollow, defeat 15 Wolves, return through the portal and speak with Mira again. Claim **75 gold and a four-weapon trial kit: Elderwood Blade (Knight), Bow (Archer), Staff (Mage), and Dagger (Rogue)**, then equip any weapon from the Bag. All four are usable by Civilians before class selection. The journal and HUD show real quest progress; Mira’s marker changes from `!` to `?` when ready to turn in.

Only server-credited killing blows after acceptance count. Manual and AUTO combat both work; historical kills and offline training do not advance the quest. Acceptance and turn-in require being near Mira on the correct map/floor. Claiming is one-time and persistent per character. Existing characters begin with the quest unaccepted. No database migration or new environment variables are needed: the reserved quest tables from the foundation migration are used.

`npm run test:browser:quest` exercises the complete live flow, including real portal travel in both directions, five AUTO kills, turn-in, equipping all four weapons, reconnecting, and mobile display. Integration tests also hold the database row during claim and drop the connection to verify that the reward survives without duplication.

### Trying the four class paths

| Path   | Weapon                       | Basic range | Attack interval | Behavior                                  |
| ------ | ---------------------------- | ----------- | --------------- | ----------------------------------------- |
| Knight | Elderwood Blade (+8 attack)  | 78          | 650 ms          | Melee; Cleave skill                       |
| Archer | Elderwood Bow (+6 attack)    | 280         | 850 ms          | Traveling arrows; Power Shot skill        |
| Mage   | Elderwood Staff (+8 attack)  | 320         | 1000 ms         | Traveling magic bolts; Arcane Burst skill |
| Rogue  | Elderwood Dagger (+4 attack) | 58          | 380 ms          | Fast melee; Flurry skill                  |

All trial weapons work with manual and AUTO combat. Ranged damage is resolved on server projectile collision, with range and facing validated. The skill button costs 12 MP and shares a five-second cooldown across weapons; basic attacks, including staff bolts, cost no MP. Switching weapons does not bypass an attack already on cooldown. AUTO walks to owner-only loot after ranged kills. The Crystal Caverns class quest unlocks permanent class choice and three talent branches.

Characters who claimed the earlier sword-only reward can speak to Mira and **Collect class weapons** once to receive the bow, staff and dagger. Gold and the sword are not repeated. A versioned internal `QuestProgress` reward ledger makes the upgrade persistent and idempotent without a schema migration. New turn-ins receive all four weapons and 75 gold together.

`npm run test:browser:weapons` checks the four equipment visuals and arrow/orb rendering on desktop/mobile. Combat tests cover actual delayed hits, range/facing, cooldown switching, duplicate-hit prevention and AUTO loot with every weapon.

## Structure and authority

- `apps/web`: React + Vite + Tailwind HUD and Phaser 3 rendering/Arcade bodies. Phaser is lazy loaded when entering the world. Player characters load original male/female texture atlases from `public/assets/characters`; wolves use their animation sheet in `public/assets/monsters`. Whispering Woods uses its forest panorama, textured terrain, wooden ladders and decorative prop atlas; Elderwood Village and village NPCs retain code-drawn placeholders. Idle/walk and attacks follow server snapshots; player damage does not interrupt animations; jumping follows physics and climbing pauses on a stationary ladder. Outfit colors and equipped swords render separately. Defeat creates a cosmetic death animation without delaying the authoritative respawn. HUD and character previews use the same Citizen artwork.
- `apps/server`: Colyseus map rooms, HTTP guest/account/character APIs, Prisma persistence, schema, and initial SQL migration.
- `packages/shared`: pure deterministic movement/collision, ladder graph routing, combat, loot ownership, XP, and offline reward calculations. Tests run the same code the server uses.
- `packages/game-data`: rules, items, maps, progression formulas, island reservations, class/skill definitions, and a Tiled object-layer adapter.

The server runs movement at 30 ticks/second and broadcasts snapshots at 15 Hz. Clients submit **boolean intents**, never coordinates, damage, XP, gold, inventory, or clocks. The authoritative shared movement solver handles gravity, jump arcs, one-way platforms, bounds, and ladders; Phaser Arcade sprites interpolate those server results instead of running a second competing authority. The client does not currently predict local movement. AUTO traverses a platform/ladder graph and moves at normal speed; no platform teleportation is used. It hunts across all three upper platforms in the tests. Jump links and general obstacle traversal are an expansion to the navigation graph; the shipped map is fully connected by ladders.

Monster damage, player damage, cooldowns, loot ownership, and rewards are computed on the server. Dead monsters cannot award again until respawn. Inputs expire after 300ms without a heartbeat. Chat is rate limited, length limited, stripped of control/angle-bracket characters, and rendered as React text. There is no language filter, reporting queue, or moderator dashboard yet.

The milestone persists each character as a transactionally updated JSON snapshot in PostgreSQL. Saves run every five seconds and on leave, travel, and explicit save-and-exit. A crash can lose up to five seconds of unsaved online progress. Normalized inventory/equipment/skills/cosmetics tables remain reserved. The existing `Quest` and `QuestProgress` tables now store Mira’s definition and durable acceptance/progress/claim ledger. Quest progress is copied into public snapshots for the HUD. Acceptance and reward claims lock the character row and update the ledger and character snapshot in one transaction. Quest operations share the room’s ordered save queue; periodic saves skip pending quest operations, and disconnect saves wait for them, preventing an older snapshot from erasing a claimed reward. Offline claims lock the character row, grant rewards, insert a claim record, and remove the activity in one transaction. Entering a room also settles any pending activity so offline time cannot continue accumulating while online.

An in-process character reservation prevents duplicate sessions in the supported **single server process**. Deploy one instance until distributed leases/room presence and durable reward-event handling are implemented. Re-entry after disconnect uses the persistent session and last saved character. Seamless socket/session restoration is not implemented.

## Prisma and restricted cloud networks

Prisma is pinned to 7.10.1 with its JavaScript PostgreSQL adapter. The standard Prisma CLI eagerly downloads a native schema engine even for generation. This cloud's allowlist blocks that engine host, so `db:generate` and `db:migrate` use the **official, pinned npm-distributed** Prisma generator, WASM schema parser, and WASM migration engine directly. npm integrity/TLS checks stay enabled; no checksums are skipped. The wrapper scripts are in `apps/server` and use the same SQL migrations and `_prisma_migrations` history as the CLI.

`prisma-wasm.mjs` initializes the package's WASM bindings and binds Prisma's migration-aware PostgreSQL adapter. `generate-client.mjs` uses the official JS generator's programmatic API. These are version-sensitive APIs: update their dependencies together, rerun type checks and the integration suite, and never silently upgrade one package. On an unrestricted network, the normal Prisma CLI can also operate on this schema and migration history from `apps/server`; `prisma.config.ts` supplies its datasource.

## Deployment

Configuration is prepared, not deployed:

- **Vercel**: import this monorepo using `vercel.json`. Set `VITE_SERVER_URL` to the public Render HTTPS origin before building. The output is `apps/web/dist`.
- **Render**: use `render.yaml`, supply `DATABASE_URL` from a separately hosted PostgreSQL database and `WEB_ORIGIN` as the exact Vercel frontend origin. The build generates Prisma, validates types, and builds the frontend; the pre-deploy command applies migrations. The server starts from TypeScript using `tsx`, so build dependencies must be retained. One instance is required.
- Use HTTPS/WSS in production. Keep database credentials in platform secrets. A free Render instance may sleep and interrupt active rooms. Before a public launch, add account verification/recovery, persistent rate limiting, distributed session leases, moderation tools, telemetry, backups, anti-bot controls and load tests. These deployment configs do not provision or publish anything automatically from this checkout.

## Scope and expansion

The playable scope is Elderwood Village, four Whispering Woods areas and four Crystal Caverns areas, with quest progression, gathering/crafting, equipment identification and sales, class choice/talents, offline activities, reconnect recovery and audio. The next five hunting islands are defined but not playable. Parties, private boss instances, account recovery and production scaling remain future work. See [Crystal systems](docs/crystal-caverns.md) for mechanics and validation limits.

### Trainable combat skills and attributes

The Skills button under the profile opens saved combat training, gathering/crafting levels, and live attributes. Weapon trials determine active training: Knight swords and Rogue daggers train Melee, Mage staffs train Magic, and Archer bows train Distance. Civilians have no active combat skill and do not gain combat training. Changing weapons preserves each skill’s XP.

Successful hits award 3 weapon XP. Melee, Magic and Distance start at level 1, require level × 30 XP, and cap at 100. Each level adds 2 base damage for the equipped weapon’s matching skill. Training never increases critical chance or other attributes. Previous Defense/Evasion/Vitality/Focus XP is retained in old saves but no longer trains or grants attributes. Gathering and Blacksmithing remain unchanged.

### Equipment identification

Normal Woods monsters have a 10% chance to drop one unidentified weapon or armor piece; Forest Bear guarantees one. Drops remain owner-only until collected. Each piece has a unique ID and its own saved attributes, separate from stackable materials and existing trial weapons. Woods gear requirements are level 1/4/7/10 for wolves/spiders/boars/bear. Armor has four separately equippable slots: helmet, chestplate, leggings and boots. These inventory sprites do not change character animation artwork.

Uncommon/Rare/Epic/Legendary rolls are 65%/25%/8.5%/1.5%. Identification reveals 1/2/3/4 distinct attributes, with increasing roll strength. Bring gear to Bram in Elderwood Village and open Bag: fees are 25/75/200/500 gold per ten-level tier. Identification is permanent; it cannot reroll. The server validates ownership, distance, funds and revision, locks the character row, and persists the gold charge and attributes together. Duplicate/stale requests cannot charge or roll twice.

Only ready, owned, level-eligible and equipped gear grants its attributes. Crafted gear is ready immediately; only monster drops can be identified. Weapon/armor attributes stack: crit chance, crit damage, dodge, block, armor, health, mana and regeneration. Existing trial weapons still equip normally with base weapon damage. Training affects base damage only. The Skills panel shows exact resulting stats. Chance/armor caps remain 30% crit, 25% dodge, 30% block, 30 armor and 250% critical damage; block reduces basic damage by 35%. Boss slams still require physically moving clear. Gear and identification revisions save in the existing character JSON; no migration is required. Permanent class selection remains future work.

### Island equipment and mining recipes

Seven coordinated sets contain 56 inventory sprites: Ironwood (Woods), Crystal, Mireguard (Murkmire), Frostforged, Emberforged, Astral (Celestial), and Shadowforged. Each set includes sword/bow/staff/dagger plus helmet/chestplate/leggings/boots. The seven transparent 1774×887 atlases use four columns and two rows, with manifests for UI and Woods loot rendering.

All 28 island weapons also have integrated male and female player animation sheets: 56 transparent sheets with six frames each for idle, walking, jumping, attack and death. Equipment IDs select the actual held design, while starter weapons retain their original art. Ladders always use unarmed sprites and gathering uses tool sprites. Sheets load only for equipped weapons; outfit variants are prepared on demand, preserving the weapon colors. Inactive sheets are evicted when the cache exceeds twelve entries, with a grace period and protection for sprites still in use. Run `npm run test:browser:island-weapons` to check every weapon and both appearances.

Bram’s forge has an island selector, 56 equipment recipes and all seven bar types. Every bar costs 20 matching ore. Equipment costs 5/10/20/35/55/80/120 bars per piece across the seven tiers; character and Blacksmithing requirements are 1/11/21/31/41/51/61. Existing Iron tools still cost 5 Iron Bars and 20 Oak Logs and require manual equipment. Only Iron smelts and tool crafts advance Bram’s original quest.

Crafted pieces are Common with fixed stats, marked `source: crafted`, ready to equip, and rejected by the server’s identification operation. Monster drops have `source: monster`, retain Uncommon–Legendary identification and roll permanent attributes at Bram. Legacy drops without a source remain compatible. Future island drop pools are defined and tested; only Woods is currently playable and gathering later island ores waits for those islands. No database migration is needed.

### Equipment management and Woods balance

Bag shows all five equipment slots plus accessory, rarity filtering, and comparisons against the currently equipped item. Comparisons use actual derived stats, including weapon-skill changes and caps; unidentified attributes stay hidden. Visit Bram to sell an unequipped piece, review its gold value, then confirm or cancel. Equipped gear cannot be sold. Selling and identification share the serialized save queue, character lock and equipment revision, so repeated requests cannot duplicate gold.

Ground loot and owner-only pickup effects show item sprites, numeric quantities and equipment rarity glows instead of item-name text. Regular Woods hunting areas each spawn ten monsters (previously five); boss rooms still spawn one boss. All four weapon specials use generated eight-frame animated effects, with animated empowered arrows and magic projectiles. Their colors follow the equipped weapon’s island theme while preserving the same animation shapes and timing; in-flight effects retain the weapon used to cast them. Specials progress through ranks 1–7 with equipment tiers: damage and reach rise each tier, and every two tiers add a target or Flurry strike (three at rank 1, six at rank 7). The combat button shows the current rank, with exact damage and coverage in its tooltip. Mana stays at 12 MP; base cooldown is five seconds, reduced by class discipline talents. Forest Bear now has 1,100 HP so ordinary geared characters encounter the dodge mechanic. Weapon damage scaling now accounts for attack speed; boss warning timing, quest counts, ore/bar costs and drop/key odds are retained. See [the balance report](docs/woods-balance.md) for assumptions, measurements and economy estimates; reproduce it with `npm run balance:woods`.

### Illustrated world map and Teleport Crystals

World Map is a panel-free, full-screen carousel with Elderwood Village plus seven hunting islands with one transparent island visible at a time and its name as the title. Previous/next arrows, numbered pagination, left/right keyboard keys and mobile swipes change slides. Four generated circular teleport buttons sit directly on each island, with the monster or boss name above each circle and travel status below it. Island artwork stays free of monster illustrations. Click a visited location to teleport. Elderwood Village is the first carousel slide, with its own transparent village illustration, a Safe hub subtitle and one central return-home button. It stays separate from the seven hunting-island progression tiers. Opening the map while in the village selects its hub slide; other areas select their hunting island. Unbuilt areas remain visible but disabled even when an island’s future access has been earned.

Each teleport consumes one Teleport Crystal; direct boss entry also consumes its normal boss key. Server validation checks the target, visit history, required level, current location, crystals and key before making any changes. Teleports stop AUTO/gathering, clear movement and targets, preserve health, and arrive at the destination’s spawn. They use the existing ordered save-before-room-transfer flow; repeated travel messages cannot charge twice. Failed validation never spends items. Walking through portals remains free and records discoveries.

Characters receive three starter crystals once on first login after this update, saved atomically with a per-character flag. Existing current-map and quest/boss history restore proven area visits. Crystals also have a 5% monster drop chance and can be bought at Bram for 25 gold each from the World Map panel. Purchases use the same revision/row-lock/save queue as Bram’s equipment services. Visit/crystal state uses the existing saved JSON, so no database migration is required.

The carousel uses eight individual RGBA cutouts under `/assets/backgrounds/island-maps/`; dimensions and source artwork are recorded in their manifest. Exterior pixels are transparent, while terrain, caves, pools and waterfalls remain intact. Only the active island image is mounted. `/assets/ui/teleport-crystal.png` remains 1254×1254 RGBA with true transparent empty space. `npm run test:browser:world-map` checks the village hub plus all seven distinct hunting-island images, generated circular buttons, monster labels above them, panel-free layout, arrow/keyboard/swipe navigation, swipe click suppression, destination locks, purchases, crystal/key charges, 320/390 px portrait and 844×390 landscape bounds, Escape-to-close, saves and re-entry. Unit and WebSocket integration tests cover forged destinations, duplicate requests, discovery and one-time starter grants.

The round destination sprite is `/assets/ui/teleport-destination.png` (1254×1254 RGBA with clear exterior pixels). Map travel controls and crystal balance sit in a compact footer; there is no framed modal, companion heading, rectangular location card or shop panel behind the island.

Elderwood’s island art matches the existing green-roofed buildings: cottages, a village hall, Bram’s forge, a market, a stream and waterfalls around a central square. The village has no hunting spawns or boss marker. Previewing its slide costs nothing; its central teleport button uses the normal one-crystal return-home rule. The quick home control remains available on the hunting slides.

### Performance delivery

Images use lossless, content-addressed WebP copies with immutable delivery caching. Armed/gathering sheets and outfit colors load on demand. Multiplayer clients negotiate field-level snapshot deltas with periodic full-state recovery; legacy full snapshots remain supported. Phaser receives every update while React skips unchanged HUD state and coalesces bursts. See [performance measurements and repeatable checks](docs/performance.md) for the local 24-player and mobile-emulation results and their limits.
