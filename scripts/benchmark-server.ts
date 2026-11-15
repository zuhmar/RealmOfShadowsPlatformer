import { World, createPlayer, SnapshotEncoder, type Player } from '@ros/shared';
import { MAPS } from '@ros/game-data';
function measure(players: number, cached: boolean) {
  const world = new World(MAPS['frostfall-3']);
  const streams = Array.from({ length: players }, (_, i) => {
    const p = createPlayer(`p${i}`, `P${i}`, world.map.id);
    Object.assign(p, {
      level: 40,
      hp: 10000,
      classId: 'mage',
      weapon: 'frost-staff',
      auto: true,
      x: 300 + i * 80,
    });
    world.players.set(p.id, p);
    return { id: p.id, encoder: new SnapshotEncoder() };
  });
  let simulationMs = 0,
    encodingMs = 0,
    bytes = 0;
  const samples: number[] = [];
  for (let tick = 0; tick < 900; tick++) {
    const now = 100000 + (tick * 1000) / 30;
    let start = performance.now();
    world.step(1 / 30, now, new Map());
    simulationMs += performance.now() - start;
    if (tick % 2) continue;
    const publicPlayers = cached ? new Map<string, Player>() : undefined;
    const fields = cached ? new WeakMap() : undefined;
    start = performance.now();
    for (const s of streams)
      bytes += JSON.stringify(
        s.encoder.encode(world.snapshot(now, s.id, publicPlayers), false, fields).data,
      ).length;
    const elapsed = performance.now() - start;
    encodingMs += elapsed;
    samples.push(elapsed);
  }
  samples.sort((a, b) => a - b);
  return {
    players,
    broadcastCache: cached,
    simulatedSeconds: 30,
    simulationMs: +simulationMs.toFixed(1),
    encodingMs: +encodingMs.toFixed(1),
    broadcastP95Ms: +samples[Math.floor(samples.length * 0.95)].toFixed(2),
    jsonBytesPerSecond: Math.round(bytes / 30),
  };
}
// Compare both paths in one process; this is a local CPU/JSON estimate, not production capacity.
console.log(
  JSON.stringify(
    [measure(4, false), measure(4, true), measure(24, false), measure(24, true)],
    null,
    2,
  ),
);
