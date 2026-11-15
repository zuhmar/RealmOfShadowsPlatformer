# Click, walk and interact

Click/tap an NPC, crafting bench, resource node, portal/boss prop, house door or owned chest to approach it using ordinary movement and the map's connected ladders. The server resolves the target's coordinates from current map/house data; clients cannot supply coordinates or bypass proximity. The interaction happens only when grounded on its platform and within range. Boss keys and island access are still checked on portal entry.

Movement, jumping, attacking, E, or toggling hunting AUTO cancels the trip. Selecting another object replaces the destination. Trips stop on defeat, disconnect, missing/revoked targets, unreachable platforms, eight seconds without progress or a two-minute overall timeout. Arena/Battleground countdowns pause navigation; existing Leave/Forfeit buttons still behave normally. Navigation never attacks monsters automatically.

Resource arrival starts normal continuous gathering. NPC arrival opens its dialog. Door arrival uses existing invitation/house-entry checks. Chest arrival rechecks ownership and proximity, then tells the client to open the separate storage popup. Pending approaches are room-local and are not restored from saves or reconnects. E retains its nearby-interaction behavior.

Validation includes `tests/approach.test.ts` (every playable NPC/node/portal via real movement), `tests/walk-interactions.integration.ts` (arrival-only dialogs, cancellation/replacement, gathering ladders, upper-floor chest and house exit), `scripts/browser-click-interactions.mjs` (mouse/touch target routing) and `scripts/browser-walk-interactions.mjs` (actual click/walk/dialog flow).
