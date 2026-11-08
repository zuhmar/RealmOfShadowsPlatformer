import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'colyseus.js';
import { MAPS } from '@ros/game-data';
import { World, createPlayer, knowsRecipe, type Player } from '@ros/shared';
import { db, save, json } from '../apps/server/src/db';
import { changeForge } from '../apps/server/src/forge';
const pause = (n: number) => new Promise((r) => setTimeout(r, n));
test('real monster recipe loot persists across save, crafting and reentry; RPC cannot forge discovery', async () => {
  let userId: string | undefined;
  let room: any;
  try {
    const guest = await fetch('http://localhost:2567/api/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).then((r) => r.json());
    const c = await fetch('http://localhost:2567/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${guest.token}` },
      body: JSON.stringify({ name: 'ScrollHunter', appearance: 'male', outfit: 'sage' }),
    }).then((r) => r.json());
    userId = c.userId;
    let p = createPlayer(c.id, 'ScrollHunter', 'village');
    p.x = 1360;
    p.y = 650;
    p.inventory = { 'brook-trout': 10 };
    await save(p);
    room = await new Client('ws://localhost:2567').joinOrCreate('map', {
      token: guest.token,
      characterId: c.id,
      mapId: 'village',
    });
    let ready = false;
    const results: any[] = [];
    for (const name of ['welcome', 'events', 'chat', 'notice']) room.onMessage(name, () => {});
    room.onMessage('snapshot', () => {
      ready = true;
    });
    room.onMessage('provisionResult', (r: any) => results.push(r));
    for (let n = 0; !ready && n < 100; n++) await pause(30);
    assert.ok(ready);
    room.send('provision', {
      action: 'craft',
      recipeId: 'trout-skewers',
      unlockedRecipes: ['trout-skewers'],
    });
    for (let n = 0; !results.length && n < 100; n++) await pause(30);
    assert.equal(results[0]?.ok, false);
    assert.match(results[0].message, /Find this recipe/);
    await room.leave();
    room = undefined;
    await pause(150);
    p = (await db.character.findUniqueOrThrow({ where: { id: c.id } })).data as unknown as Player;
    assert.equal(p.inventory['brook-trout'], 10);
    assert.ok(!knowsRecipe(p, 'trout-skewers'));
    const world = new World(MAPS.woods);
    world.players.set(p.id, p);
    world.hitWolf(p, world.wolves[0], 100000, 1000);
    const drop = world.drops.find((d) => d.items?.some((i) => i.item === 'recipe:iron-bar'));
    assert.ok(drop);
    assert.ok(!knowsRecipe(p, 'iron-bar'));
    p.x = drop.x;
    p.y = drop.y;
    world.collect(p, 1001);
    assert.ok(knowsRecipe(p, 'iron-bar'));
    p.mapId = 'village';
    p.x = 900;
    p.y = 650;
    p.inventory = { 'iron-ore': 20 };
    await save(p);
    p = (await db.character.findUniqueOrThrow({ where: { id: c.id } })).data as unknown as Player;
    assert.ok(knowsRecipe(p, 'iron-bar'));
    p = (await changeForge(p, 'accept')).next;
    p = (await changeForge(p, 'craft', 'iron-bar')).next;
    assert.equal(p.inventory['iron-bar'], 1);
    assert.equal(p.inventory['recipe:iron-bar'], undefined);
    const stored = (await db.character.findUniqueOrThrow({ where: { id: c.id } }))
      .data as unknown as Player;
    assert.ok(knowsRecipe(stored, 'iron-bar'));
    assert.equal(stored.inventory['iron-ore'], undefined);
  } finally {
    if (room) await room.leave();
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
});
