import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import { MAPS, QUESTS, FROSTFALL_QUESTS } from '@ros/game-data';
import { createPlayer, type Player, type Snapshot } from '@ros/shared';
import { db, json, session, save } from '../apps/server/src/db';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean) {
  const started = Date.now();
  while (!fn()) {
    if (Date.now() - started > 8_000) throw new Error('Frost Warden RPC timed out');
    await pause(25);
  }
}
test(
  'all Frost Warden quests accept and turn in through the real room request, with proximity and duplicate-reward guards',
  { timeout: 60_000 },
  async () => {
    let userId: string | undefined, room: Room | undefined;
    try {
      const user = await db.user.create({ data: {} });
      userId = user.id;
      let p = createPlayer('fixture', 'WardenRPC', 'frostfall');
      Object.assign(p, {
        level: 40,
        bossKills: { hydra: 1 },
        quests: { 'murkmire-hydra': { progress: 1, claimed: true } },
      });
      const row = await db.character.create({ data: { userId, name: p.name, data: json(p) } });
      p.id = row.id;
      await db.quest.upsert({
        where: { id: 'murkmire-hydra' },
        create: { id: 'murkmire-hydra', definition: QUESTS['murkmire-hydra'] },
        update: {},
      });
      await db.questProgress.create({
        data: { characterId: p.id, questId: 'murkmire-hydra', progress: 1, claimed: true },
      });
      await save(p);
      const token = await session(user.id),
        client = new Client('ws://localhost:2567');
      let snapshot: Snapshot | undefined;
      const results: { ok: boolean; message: string }[] = [];
      const join = async () => {
        snapshot = undefined;
        room = await client.create('map', { token, characterId: p.id, mapId: 'frostfall' });
        for (const name of ['welcome', 'events', 'chat', 'notice']) room.onMessage(name, () => {});
        room.onMessage('snapshot', (s: Snapshot) => (snapshot = s));
        room.onMessage('questResult', (v: { ok: boolean; message: string }) => results.push(v));
        await until(() => !!snapshot);
      };
      const leave = async () => {
        await room!.leave();
        room = undefined;
        await pause(150);
        p = (await db.character.findUniqueOrThrow({ where: { id: p.id } }))
          .data as unknown as Player;
      };
      const action = async (questId: string, action: string) => {
        const count = results.length;
        room!.send('quest', { questId, action, progress: 99999 });
        await until(() => results.length > count);
        return results[count];
      };
      await join();
      room!.send('settings', { skills: true, loot: true, target: 'nearest', healBelow: 0 });
      await until(() => snapshot!.players.find((q) => q.id === p.id)?.settings.healBelow === 0);
      assert.equal((await action('frostfall-wolves', 'accept')).ok, false);
      assert.match(results.at(-1)!.message, /Frost Warden/);
      await leave();
      const npc = MAPS.frostfall.npcs.find((n) => n.id === 'frostwarden')!;
      p.x = npc.x;
      p.y = npc.y;
      p.platform = MAPS.frostfall.platforms.find(
        (f) => f.y === npc.y && npc.x >= f.x && npc.x <= f.x + f.width,
      )!.id;
      p.grounded = true;
      await save(p);
      for (const quest of Object.values(FROSTFALL_QUESTS)) {
        await join();
        assert.equal((await action(quest.id, 'accept')).ok, true, quest.id);
        assert.equal(
          (await action(quest.id, 'claim')).ok,
          false,
          'client-forged progress cannot complete a hunt',
        );
        await leave();
        p.quests![quest.id].progress = quest.target.count;
        await save(p);
        await join();
        assert.equal((await action(quest.id, 'claim')).ok, true, quest.id);
        assert.equal((await action(quest.id, 'claim')).ok, false, 'reward cannot repeat');
        await leave();
      }
      assert.equal(p.gold, 12_400);
      assert.equal(p.inventory.frostpine, 50);
      assert.equal(p.inventory['frostfall-boss-key'], 1);
      assert.ok(p.quests?.['frostfall-giant']?.claimed);
    } finally {
      if (room?.connection.isOpen) await room.leave().catch(() => {});
      await pause(150);
      if (userId) await db.user.delete({ where: { id: userId } });
      await db.$disconnect();
    }
  },
);
