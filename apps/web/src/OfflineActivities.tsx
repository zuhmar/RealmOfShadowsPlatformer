import { useState } from 'react';
import { itemDefinition } from '@ros/game-data';
import type { ActivityReward } from '@ros/shared';
import { ItemIcon } from './ItemIcon';
export function activitySummary(reward: ActivityReward) {
  return (
    [
      reward.xp ? `+${reward.xp} XP` : '',
      reward.gold ? `+${reward.gold} gold` : '',
      ...Object.entries(reward.items ?? {}).map(
        ([id, n]) => `${n} ${itemDefinition(id)?.name ?? id}`,
      ),
      reward.skillXp ? `+${reward.skillXp} ${reward.skill} XP` : '',
    ]
      .filter(Boolean)
      .join(' · ') || 'No full reward cycle yet'
  );
}
export function OfflineActivities({
  active,
  reward,
  choices,
  busy,
  assign,
  claim,
}: {
  active: boolean;
  reward: ActivityReward | null;
  choices: { id: string; label: string }[];
  busy: boolean;
  assign: (id: string) => void;
  claim: () => void;
}) {
  const [selected, setSelected] = useState('training');
  return (
    <div className="offline-activities">
      {active ? (
        <div className="offline-reward">
          <b>Working while away</b>
          <p>{reward ? activitySummary(reward) : 'Rewards are accumulating.'}</p>
          {Object.entries(reward?.items ?? {}).map(([id, n]) => (
            <span key={id}>
              <ItemIcon id={id} />
              {n}
            </span>
          ))}
          <button className="text-button" disabled={busy} onClick={claim}>
            Claim rewards →
          </button>
        </div>
      ) : (
        <>
          <label>
            Offline activity{' '}
            <select
              aria-label="Offline activity"
              value={selected}
              disabled={busy}
              onChange={(e) => setSelected(e.target.value)}
            >
              {choices.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <button className="text-button" disabled={busy} onClick={() => assign(selected)}>
            Assign activity
          </button>
        </>
      )}
      <small>
        Up to 8 hours. Hunting and gathering run at 35% efficiency. No boss kills, quest progress or
        rare gear drops while offline.
      </small>
    </div>
  );
}
