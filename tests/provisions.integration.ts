import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import { db } from '../apps/server/src/db';
import { changeProvision } from '../apps/server/src/provisions';
import { attackPower, type Player, type Snapshot } from '@ros/shared';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > 8000) throw new Error('Recipe test timed out');
    await pause(20);
  }
}
test('recipe RPC enforces stations, charges once, persists buffs/cooldowns and serializes stale crafts', async () => {
  let userId: string | undefined;
  const rooms: Room[] = [];
  try {
    const guest = await fetch('http://localhost:2567/api/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).then((r) => r.json());
    const c = await fetch('http://localhost:2567/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${guest.token}` },
      body: JSON.stringify({ name: 'RecipeTester', appearance: 'male', outfit: 'sage' }),
    }).then((r) => r.json());
    userId = c.userId;
    await db.character.update({
      where: { id: c.id },
      data: {
        data: {
          ...c.data,
          unlockedRecipes: ['trout-skewers', 'greenleaf-health-potion'],
          x: 1360,
          y: 650,
          level: 20,
          hp: 30,
          mp: 0,
          inventory: {
            'brook-trout': 30,
            greenleaf: 50,
            'greenleaf-health-potion': 2,
            'greenleaf-mana-potion': 1,
          },
        },
      },
    });
    const client = new Client('ws://localhost:2567');
    const join = async () => {
      const r = await client.joinOrCreate('map', {
        token: guest.token,
        characterId: c.id,
        mapId: 'village',
      });
      rooms.push(r);
      const state: { p?: Player; results: { ok: boolean; message: string }[] } = { results: [] };
      for (const name of ['welcome', 'events', 'chat', 'notice']) r.onMessage(name, () => {});
      r.onMessage('snapshot', (s: Snapshot) => {
        state.p = s.players.find((p) => p.id === c.id);
      });
      r.onMessage('provisionResult', (result: any) => state.results.push(result));
      await until(() => !!state.p);
      return { r, state };
    };
    let { r, state } = await join();
    r.send('provision', { action: 'craft', recipeId: 'greenleaf-health-potion' });
    await until(() => state.results.length === 1);
    assert.equal(state.results[0].ok, false);
    assert.match(state.results[0].message, /Alchemy Table/);
    r.send('provision', { action: 'craft', recipeId: 'forged-food', cost: 0 });
    await until(() => state.results.length === 2);
    assert.equal(state.results[1].ok, false);
    r.send('provision', { action: 'craft', recipeId: 'trout-skewers' });
    r.send('provision', { action: 'craft', recipeId: 'trout-skewers' });
    await until(() => state.results.length === 4);
    assert.equal(state.results.slice(2).filter((x) => x.ok).length, 1);
    await until(() => state.p!.inventory['trout-skewers'] === 1);
    assert.equal(state.p!.inventory['brook-trout'], 20);
    assert.ok(state.p!.craftingSkills?.Cooking);
    r.send('provision', { action: 'use', recipeId: 'trout-skewers' });
    await until(() => !!state.p!.foodBuff);
    assert.ok(attackPower(state.p!) > attackPower({ ...state.p!, foodBuff: undefined }));
    assert.equal(state.p!.inventory['trout-skewers'], undefined);
    const hp = state.p!.hp;
    r.send('provision', { action: 'use', recipeId: 'greenleaf-health-potion' });
    await until(() => !!state.p!.potionReadyAt);
    assert.ok(state.p!.hp >= hp + 40);
    assert.equal(state.p!.inventory['greenleaf-health-potion'], 1);
    const ready = state.p!.potionReadyAt;
    const resultCount = state.results.length;
    r.send('provision', { action: 'use', recipeId: 'greenleaf-mana-potion' });
    await until(() => state.results.length > resultCount);
    assert.match(state.results.at(-1)!.message, /cooldown/);
    assert.equal(state.p!.inventory['greenleaf-mana-potion'], 1);
    await r.leave();
    await pause(100);
    const stored = (await db.character.findUniqueOrThrow({ where: { id: c.id } }))
      .data as unknown as Player;
    assert.equal(stored.foodBuff!.recipeId, 'trout-skewers');
    assert.equal(stored.potionReadyAt, ready);
    stored.foodBuff!.expiresAt = Date.now() - 1;
    await db.character.update({
      where: { id: c.id },
      data: { data: JSON.parse(JSON.stringify(stored)) },
    });
    ({ r, state } = await join());
    await until(() => !state.p!.foodBuff);
    assert.equal(state.p!.potionReadyAt, ready);
    await r.leave();
    await pause(100);
    const snapshot = (await db.character.findUniqueOrThrow({ where: { id: c.id } }))
      .data as unknown as Player;
    const attempts = await Promise.allSettled([
      changeProvision(structuredClone(snapshot), 'craft', 'trout-skewers'),
      changeProvision(structuredClone(snapshot), 'craft', 'trout-skewers'),
    ]);
    assert.equal(attempts.filter((r) => r.status === 'fulfilled').length, 1);
    const saved = (await db.character.findUniqueOrThrow({ where: { id: c.id } }))
      .data as unknown as Player;
    assert.equal(saved.inventory['brook-trout'], 10);
    assert.equal(saved.inventory['trout-skewers'], 1);
    assert.equal(saved.provisionRevision, (snapshot.provisionRevision ?? 0) + 1);
  } finally {
    for (const r of rooms) if (r.connection.isOpen) await r.leave().catch(() => {});
    await pause(100);
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
});
