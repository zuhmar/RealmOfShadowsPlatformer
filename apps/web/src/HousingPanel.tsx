import { useState } from 'react';
import {
  HOUSING_PLOTS,
  HOUSE_STAGES,
  CARPENTRY_RECIPES,
  houseStageCost,
  itemDefinition,
  type PlotSize,
} from '@ros/game-data';
import { nearHousing, type Player } from '@ros/shared';
import { ItemIcon } from './ItemIcon';
const costs = (cost: Record<string, number>) =>
  Object.entries(cost)
    .map(([id, n]) => `${n} ${itemDefinition(id)?.name ?? id}`)
    .join(' + ');
export function HousingPanel({
  player: p,
  players,
  send,
}: {
  player: Player;
  players: Player[];
  send: (type: string, v: unknown) => void;
}) {
  const [position, setPosition] = useState(0),
    [pending, setPending] = useState(false);
  const near = nearHousing(p),
    view = p.housingView,
    visiting = !!view && view.ownerId !== p.id;
  const act = (action: string, id?: string, x?: number) => {
    if (pending) return;
    setPending(true);
    send('housing', { action, id, x });
    setTimeout(() => setPending(false), 800);
  };
  const h = p.housing,
    level = p.carpentry?.level ?? 1;
  return (
    <section className="housing-panel">
      <p>
        Climb the central village ladder to the housing platform. Your house is private. Invitations
        let other adventurers visit your plot while you are together in this village.
      </p>
      <p>
        <b>Carpentry Lv. {level}</b> ·{' '}
        {near ? 'At the housing platform' : 'Build and visit from the housing platform'}
      </p>
      {visiting ? (
        <>
          <h3>
            Visiting {view.ownerName} · {HOUSE_STAGES[view.stage]}
          </h3>
          <button disabled={!near || pending} onClick={() => act('home')}>
            Return to my plot
          </button>
        </>
      ) : (
        <>
          <h3>
            {h
              ? `${HOUSING_PLOTS[h.size].name} plot · ${HOUSE_STAGES[h.stage]}`
              : 'Choose your plot'}
          </h3>
          <div className="housing-options">
            {Object.entries(HOUSING_PLOTS).map(([id, d]) => (
              <article key={id}>
                <ItemIcon id={`house-${id}`} />
                <h4>{d.name} plot</h4>
                <p>
                  Carpentry Lv. {d.level} · {costs(d.cost)}
                </p>
                <p>
                  {(p.unlockedRecipes ?? []).includes(`house-${id}`)
                    ? 'Blueprint discovered'
                    : 'Blueprint: Whispering Woods monsters'}
                </p>
                <button
                  disabled={
                    !near ||
                    pending ||
                    level < d.level ||
                    (!!h && d.width <= HOUSING_PLOTS[h.size].width)
                  }
                  onClick={() => act('plot', id)}
                >
                  {h?.size === id ? 'Owned' : h ? 'Upgrade plot' : 'Build plot'}
                </button>
              </article>
            ))}
          </div>
          {h && h.stage < 3 && (
            <p>
              <button disabled={!near || pending} onClick={() => act('build')}>
                Build {HOUSE_STAGES[h.stage + 1]}
              </button>{' '}
              · {costs(houseStageCost(h.size, h.stage))}
            </p>
          )}
          <h3>Carpentry workbench</h3>
          <p>
            Find recipes on Whispering Woods monsters. Craft planks, build your house, then craft
            furniture. House upgrades preserve furniture. Furniture is decorative in this first set.
          </p>
          <div className="housing-options">
            {CARPENTRY_RECIPES.map((r) => (
              <article key={r.id}>
                <ItemIcon id={r.id} />
                <h4>{r.name}</h4>
                <p>
                  Lv. {r.level} · {costs(r.cost)} · {p.inventory[r.id] ?? 0} owned
                </p>
                <button
                  disabled={
                    !near || pending || level < r.level || !(p.unlockedRecipes ?? []).includes(r.id)
                  }
                  onClick={() => act('craft', r.id)}
                >
                  {(p.unlockedRecipes ?? []).includes(r.id) ? 'Craft' : 'Find recipe'}
                </button>
                {r.width > 0 && (
                  <button
                    disabled={!near || pending || h?.stage !== 3 || !(p.inventory[r.id] > 0)}
                    onClick={() => act('place', r.id, position)}
                  >
                    Place at {position}
                  </button>
                )}
              </article>
            ))}
          </div>
          {h && (
            <>
              <label>
                Furniture position: {position}
                <input
                  aria-label="Furniture position"
                  type="range"
                  min={-Math.floor(HOUSING_PLOTS[h.size].width / 2)}
                  max={Math.floor(HOUSING_PLOTS[h.size].width / 2)}
                  step="5"
                  value={position}
                  onChange={(e) => setPosition(Number(e.target.value))}
                />
              </label>
              <p>
                Positions run left to right from the plot’s center. Leave room between pieces.
                Remove a piece to recover it and place it elsewhere.
              </p>
              {h.furniture.map((f) => (
                <p key={f.id}>
                  {itemDefinition(f.item)?.name} · {f.x}{' '}
                  <button disabled={!near || pending} onClick={() => act('remove', f.id)}>
                    Return to bag
                  </button>
                </p>
              ))}
              <h3>Invited guests</h3>
              {h.invited.map((id) => (
                <p key={id}>
                  {players.find((p) => p.id === id)?.name ?? 'Offline adventurer'}{' '}
                  <button disabled={!near || pending} onClick={() => act('revoke', id)}>
                    Revoke invitation
                  </button>
                </p>
              ))}
            </>
          )}
        </>
      )}
      <h3>Village adventurers</h3>
      <p>
        Invited guests can select Visit. Guests cannot build, remove furniture, or invite others.
      </p>
      {players
        .filter((other) => other.id !== p.id)
        .map((other) => (
          <p key={other.id}>
            {other.name}{' '}
            <button disabled={!near || pending} onClick={() => act('visit', other.id)}>
              Visit plot
            </button>
            {h && !visiting && (
              <button
                disabled={!near || pending || h.invited.includes(other.id)}
                onClick={() => act('invite', other.id)}
              >
                Invite to my plot
              </button>
            )}
          </p>
        ))}
    </section>
  );
}
