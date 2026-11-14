import { useState } from 'react';
import type { Player } from '@ros/shared';
export function BattlegroundHud({
  player: p,
  players,
  time,
  send,
}: {
  player: Player;
  players: Player[];
  time: number;
  send: (type: string, value: unknown) => void;
}) {
  const [code, setCode] = useState('');
  const run = p.battleground;
  if (!run) return null;
  const seconds = Math.max(0, Math.ceil((run.endsAt - time) / 1000)),
    leader = run.leaderId === p.id;
  const title =
    run.phase === 'waiting'
      ? 'Frostbound Battlegrounds'
      : run.phase === 'countdown'
        ? `Expedition begins in ${seconds}`
        : run.phase === 'finished'
          ? run.rewardGold
            ? 'Expedition cleared'
            : 'Expedition ended'
          : `Wave ${run.wave} / ${run.totalWaves}`;
  return (
    <section className="battleground-hud" aria-label="Battleground expedition">
      <h2>{title}</h2>
      <p>
        {run.phase === 'waiting'
          ? 'Solo or party · Up to 4 players'
          : run.phase === 'intermission'
            ? `Next wave in ${seconds}s`
            : run.phase === 'finished'
              ? run.result
              : run.eliminated
                ? 'Knocked out · Your party can still finish'
                : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} remaining`}
      </p>
      <div className="battleground-party">
        {players.map((q) => (
          <span key={q.id}>
            {q.name}
            {q.id === run.leaderId ? ' ★' : ''} ·{' '}
            {q.battleground?.eliminated
              ? 'Out'
              : run.phase === 'waiting'
                ? q.battleground?.ready
                  ? 'Ready'
                  : 'Preparing'
                : `${Math.ceil(q.hp)} HP`}
          </span>
        ))}
      </div>
      {run.phase === 'waiting' && (
        <>
          <label className="party-code">
            Party code{' '}
            <input
              aria-label="Your party code"
              value={run.groupId}
              readOnly
              onFocus={(e) => e.target.select()}
            />
          </label>
          <div className="arena-actions">
            {leader ? (
              <button className="primary" onClick={() => send('battleground', { action: 'start' })}>
                Start {players.length === 1 ? 'solo' : 'party'} run
              </button>
            ) : (
              <button
                className="primary"
                onClick={() => send('battleground', { action: 'ready', ready: !run.ready })}
              >
                {run.ready ? 'Cancel ready' : 'Ready'}
              </button>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send('battleground', { action: 'join', code });
            }}
            className="party-join"
          >
            <input
              aria-label="Join party code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter another party’s code"
              maxLength={80}
            />
            <button disabled={!code.trim()}>Join party</button>
          </form>
        </>
      )}
      {run.phase === 'finished' && run.rewardGold && <p>+{run.rewardGold} gold · +7,000 XP</p>}
      <button onClick={() => send('travel', null)}>
        {['waiting', 'finished'].includes(run.phase) ? 'Leave battlegrounds' : 'Leave expedition'}
      </button>
    </section>
  );
}
