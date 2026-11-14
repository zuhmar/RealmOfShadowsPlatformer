import type { Player } from '@ros/shared';
export function ArenaHud({
  player,
  players,
  time,
  send,
}: {
  player: Player;
  players: Player[];
  time: number;
  send: (type: string, value: unknown) => void;
}) {
  const arena = player.arena;
  if (!arena) return null;
  const remaining = Math.max(0, Math.ceil((arena.endsAt - time) / 1000));
  const title =
    arena.phase === 'waiting'
      ? 'Mirebound Arena'
      : arena.phase === 'countdown'
        ? `Duel begins in ${remaining}`
        : arena.phase === 'fighting'
          ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
          : !arena.participant
            ? 'Duel complete'
            : arena.winnerId
              ? arena.winnerId === player.id
                ? 'Victory'
                : 'Defeat'
              : 'Draw';
  return (
    <section className="arena-hud" aria-label="Arena duel">
      <h2>{title}</h2>
      <div className="arena-fighters">
        {players.map((p) => (
          <div key={p.id} className={p.id === player.id ? 'arena-self' : ''}>
            <strong>{p.name}</strong>
            <span>
              Lv. {p.level} · {p.classId ?? 'Civilian'}
            </span>
            <meter
              aria-label={`${p.name} health`}
              min={0}
              max={p.arena?.maxHealth ?? p.hp}
              value={p.hp}
            />
            <small>
              {Math.ceil(p.hp)} / {p.arena?.maxHealth ?? Math.ceil(p.hp)} HP
              {arena.phase === 'waiting' ? (p.arena?.ready ? ' · Ready' : ' · Preparing') : ''}
            </small>
          </div>
        ))}
      </div>
      <p>
        {arena.phase === 'waiting'
          ? players.length < 2
            ? 'Waiting for a challenger…'
            : 'Both players must be ready.'
          : arena.phase === 'fighting'
            ? 'Actual gear & skills · No potions'
            : arena.phase === 'finished'
              ? `${arena.result} · Next duel in ${remaining}s`
              : 'Get ready · Gear is locked'}
      </p>
      <div className="arena-actions">
        {arena.phase === 'waiting' && (
          <button className="primary" onClick={() => send('arena', !arena.ready)}>
            {arena.ready ? 'Cancel ready' : 'Ready to duel'}
          </button>
        )}
        <button onClick={() => send('travel', null)}>
          {arena.phase === 'fighting' || arena.phase === 'countdown'
            ? 'Forfeit & leave'
            : 'Leave arena'}
        </button>
      </div>
    </section>
  );
}
