# Realm of Shadows · First Light

An original browser-based, shared-world idle platformer. The first playable milestone has a safe village, Wolf Hollow, three character slots, manual combat, real ladder-based AUTO hunting, loot, equipment, leveling, chat, PostgreSQL saves, and capped offline training. Desktop and mobile controls are included.

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

1. Choose **Play as guest**, create a Citizen, then **Enter world**.
2. In Elderwood Village, walk right to the glowing portal and press **E** (or the Portal hotbar button).
3. In Wolf Hollow, fight manually or enable **AUTO**. AUTO uses the same validated server combat as manual play. Any manual movement, attack, or skill input cancels it.
4. Collect gold and fangs near defeated wolves. Every fifth kill drops a Wayfarer Blade. Open **Bag**, select the blade, and equip it for +5 attack.
5. Leave through the upper-right exit button. This waits for server save confirmation. On character selection, assign **offline training**; use **Claim rewards** or enter the world to settle them once, capped at eight hours.

| Input                        | Action                                                             |
| ---------------------------- | ------------------------------------------------------------------ |
| A / D or left / right arrows | Walk                                                               |
| Space                        | Jump                                                               |
| W / S or up / down arrows    | Climb a nearby ladder                                              |
| Down + Space                 | Drop through an upper platform                                     |
| J                            | Basic melee attack                                                 |
| K                            | Weapon skill: 12 MP, 5-second shared cooldown, up to three targets |
| E                            | Travel through a nearby portal                                     |

Mobile has held direction, climb, jump, and attack buttons, plus the same skill/AUTO hotbar. Item details support keyboard focus and touch. No audio or third-party game artwork is used.

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

In Elderwood Village, approach **Mira** on the village path and press **E**, click her, or use the **Interact** hotbar button. Accept **The first trial**, travel to Wolf Hollow, defeat five Wolves, return through the portal and speak with Mira again. Claim **75 gold and a four-weapon trial kit: Elderwood Blade (Knight), Bow (Archer), Staff (Mage), and Dagger (Rogue)**, then equip any weapon from the Bag. All four are usable by Citizens before class selection. The journal and HUD show real quest progress; Mira’s marker changes from `!` to `?` when ready to turn in.

Only server-credited killing blows after acceptance count. Manual and AUTO combat both work; historical kills and offline training do not advance the quest. Acceptance and turn-in require being near Mira on the correct map/floor. Claiming is one-time and persistent per character. Existing characters begin with the quest unaccepted. No database migration or new environment variables are needed: the reserved quest tables from the foundation migration are used.

`npm run test:browser:quest` exercises the complete live flow, including real portal travel in both directions, five AUTO kills, turn-in, equipping all four weapons, reconnecting, and mobile display. Integration tests also hold the database row during claim and drop the connection to verify that the reward survives without duplication.

### Trying the four class paths

| Path   | Weapon                       | Basic range | Attack interval | Behavior                                  |
| ------ | ---------------------------- | ----------- | --------------- | ----------------------------------------- |
| Knight | Elderwood Blade (+8 attack)  | 78          | 650 ms          | Melee; Cleave skill                       |
| Archer | Elderwood Bow (+6 attack)    | 280         | 850 ms          | Traveling arrows; Power Shot skill        |
| Mage   | Elderwood Staff (+8 attack)  | 320         | 1000 ms         | Traveling magic bolts; Arcane Burst skill |
| Rogue  | Elderwood Dagger (+4 attack) | 58          | 380 ms          | Fast melee; Flurry skill                  |

All trial weapons work with manual and AUTO combat. Ranged damage is resolved on server projectile collision, with range and facing validated. The skill button costs 12 MP and shares a five-second cooldown across weapons; basic attacks, including staff bolts, cost no MP. Switching weapons does not bypass an attack already on cooldown. AUTO walks to owner-only loot after ranged kills. This introduces weapon trials, not the full class-unlock/proficiency/skill-tree systems; the saved class remains Citizen.

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

**Implemented:** Mira’s first quest and one-time reward, guest/register/login + upgrade, three character slots and confirmed deletion, outfit/appearance preview, one playable Citizen, village and Wolf map, portal travel, platform movement/jump/drop/ladder/camera, four weapon trials with melee/ranged/magic basic attacks and weapon skills, Wolf state machine/respawns/player recovery, platform-aware AUTO and settings, XP/leveling, owner-only gold/loot, stacking inventory, weapon equip/unequip, responsive HUD/minimap, shared room chat/players/monsters, save/re-entry, offline monster training and atomic capped claims.

**Definitions/foundations only:** full class progression and proficiency skills, remaining island roster entries, Tiled object-layer import, normalized expansion database tables. The adapter imports platform/ladder layers; other map metadata stays in the base definition. It is not a general Tiled tilemap renderer.

**Not implemented:** advanced class unlocks and complete class skill trees, the other Whispering Woods monster maps, Crystal Caverns maps, bosses, gathering/crafting, banks/shops, additional quest chains, armor/accessory slots, cosmetic wardrobe/unlocks, parties, private boss instances, seamless reconnect, audio, or production scaling. Mira offers a reward-bearing first trial; other village NPCs remain scenery with roles clearly labeled, and shops are not implemented.

Seven hunting islands are defined: Whispering Woods, Crystal Caverns, four unnamed reserved islands, and Shadow Fortress. Only the supplied rosters are recorded; the later islands have no invented permanent monster roster. Shadow Dragon remains the final encounter reservation. This is the **first playable milestone**, not the complete ten-phase MMORPG.
