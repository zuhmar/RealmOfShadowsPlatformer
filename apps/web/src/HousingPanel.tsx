import { useState, useEffect } from 'react';
import {
  HOUSING_PLOTS,
  HOUSE_LAYOUTS,
  houseSize,
  HOUSE_STAGES,
  CARPENTRY_RECIPES,
  houseStageCost,
  itemDefinition,
} from '@ros/game-data';
import { nearHousing, decorationSelection, type Player } from '@ros/shared';
import { ItemIcon } from './ItemIcon';
const costs = (cost: Record<string, number>) =>
  Object.entries(cost)
    .map(([id, n]) => `${n} ${itemDefinition(id)?.name ?? id}`)
    .join(' + ');
export function HousingPanel({
  player: p,
  players,
  invitedHomes = [],
  send,
  onPlace,
}: {
  player: Player;
  players: Player[];
  invitedHomes?: { id: string; name: string }[];
  send: (type: string, v: unknown) => void;
  onPlace: (id: string) => void;
}) {
  useEffect(() => {
    send('housing', { action: 'list' });
  }, []);
  const [tab, setTab] = useState('Build'),
    [recipe, setRecipe] = useState('oak-plank'),
    [quantity, setQuantity] = useState(1),
    [pending, setPending] = useState(false);
  const h = p.housing,
    level = p.carpentry?.level ?? 1,
    near = nearHousing(p),
    view = p.housingView,
    visiting = !!view && view.ownerId !== p.id,
    inside = !!houseSize(p.mapId),
    layout = h ? HOUSE_LAYOUTS[h.size] : undefined;
  const act = (action: string, id?: string) => {
    if (pending) return;
    setPending(true);
    send('housing', { action, id, ...(action === 'craft' ? { quantity } : {}) });
    setTimeout(() => setPending(false), 800);
  };
  const r = CARPENTRY_RECIPES.find((r) => r.id === recipe)!,
    known = (p.unlockedRecipes ?? []).includes(r.id),
    maximum = Math.min(
      1000,
      ...Object.entries(r.cost).map(([id, n]) => Math.floor((p.inventory[id] ?? 0) / n)),
    ),
    total = Object.fromEntries(Object.entries(r.cost).map(([id, n]) => [id, n * quantity]));
  return (
    <section className="housing-panel">
      <p>
        <b>Carpentry Lv. {level}</b> ·{' '}
        {inside
          ? 'Inside the house'
          : near
            ? 'At the housing platform'
            : 'Climb to the central village housing platform'}
      </p>
      {visiting && (
        <p>
          Visiting {view.ownerName} · {HOUSE_STAGES[view.stage]}{' '}
          <button disabled={!near || pending} onClick={() => act(inside ? 'exit' : 'home')}>
            {inside ? 'Exit house' : 'Return to my plot'}
          </button>
        </p>
      )}
      <nav className="housing-tabs" aria-label="Housing sections">
        {['Build', 'Craft', 'Decorate', 'Guests'].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      {!visiting && tab === 'Build' && (
        <>
          <h3>
            {h
              ? `${HOUSING_PLOTS[h.size].name} plot · ${HOUSE_STAGES[h.stage]}`
              : 'Choose your plot'}
          </h3>
          {h && h.stage < 3 && (
            <section className="housing-next-step" aria-label="Next house construction step">
              <h4>
                {h.stage === 0
                  ? 'Plot claimed — build your house next'
                  : 'Continue building your house'}
              </h4>
              <p>
                Your plot is reserved in the middle of this platform, to the right of the workbench.
                Build its foundation, walls, and roof to complete your home.
              </p>
              <p>
                Next: {HOUSE_STAGES[h.stage + 1]} · {costs(houseStageCost(h.size, h.stage))}
              </p>
              <button
                disabled={
                  !near ||
                  pending ||
                  !Object.entries(houseStageCost(h.size, h.stage)).every(
                    ([id, n]) => (p.inventory[id] ?? 0) >= n,
                  )
                }
                onClick={() => act('build')}
              >
                Build {HOUSE_STAGES[h.stage + 1]}
              </button>
              <button onClick={() => setTab('Craft')}>Craft building materials</button>
            </section>
          )}
          {h?.stage === 3 && (
            <p>
              <button disabled={pending} onClick={() => act(inside ? 'exit' : 'enter')}>
                {inside ? 'Exit house' : 'Enter house'}
              </button>{' '}
              · {HOUSE_LAYOUTS[h.size].floors.length} floor(s) · {HOUSE_LAYOUTS[h.size].capacity}{' '}
              furniture spaces
            </p>
          )}
          {h?.stage === 3 && (
            <p>Your house is complete. Enter through its front door to walk around and decorate.</p>
          )}
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
                    !(p.unlockedRecipes ?? []).includes(`house-${id}`) ||
                    !Object.entries(d.cost).every(([item, n]) => (p.inventory[item] ?? 0) >= n) ||
                    (!!h && d.width <= HOUSING_PLOTS[h.size].width)
                  }
                  onClick={() => act('plot', id)}
                >
                  {h?.size === id ? 'Owned' : h ? 'Upgrade plot' : 'Build plot'}
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {!visiting && tab === 'Craft' && (
        <div className="carpentry-crafting">
          <div className="carpentry-catalog" aria-label="Carpentry recipes">
            {CARPENTRY_RECIPES.map((def) => (
              <button
                key={def.id}
                aria-pressed={r.id === def.id}
                onClick={() => {
                  setRecipe(def.id);
                  setQuantity(1);
                }}
              >
                <ItemIcon id={def.id} />
                <b>{def.name}</b>
                <small>
                  {(p.unlockedRecipes ?? []).includes(def.id)
                    ? `Lv. ${def.level} · ${p.inventory[def.id] ?? 0} owned`
                    : 'Find recipe in Whispering Woods'}
                </small>
              </button>
            ))}
          </div>
          <section className="carpentry-recipe-detail" aria-label="Selected Carpentry recipe">
            <ItemIcon id={r.id} />
            <h3>{r.name}</h3>
            <p>
              Carpentry Lv. {r.level} · {p.inventory[r.id] ?? 0} owned
            </p>
            <label>
              Quantity
              <input
                type="number"
                aria-label="Craft quantity"
                min="1"
                max="1000"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, Math.min(1000, Math.floor(Number(e.target.value) || 1))))
                }
              />
            </label>
            <div className="craft-quantity-presets">
              {[1, 5, 10].map((n) => (
                <button key={n} onClick={() => setQuantity(n)}>
                  {n}
                </button>
              ))}
              <button disabled={maximum < 1} onClick={() => setQuantity(maximum)}>
                Max ({maximum})
              </button>
            </div>
            <ul className="craft-total-cost">
              {Object.entries(total).map(([id, n]) => (
                <li key={id}>
                  <ItemIcon id={id} />
                  <span>{itemDefinition(id)?.name ?? id}</span>
                  <b className={(p.inventory[id] ?? 0) < n ? 'stat-loss' : ''}>
                    {p.inventory[id] ?? 0} / {n}
                  </b>
                </li>
              ))}
            </ul>
            <p>
              Total: {costs(total)} · {r.xp * quantity} Carpentry XP
            </p>
            <button
              className="carpentry-craft-action"
              disabled={!near || pending || !known || level < r.level || quantity > maximum}
              onClick={() => act('craft', r.id)}
            >
              {!known ? 'Find recipe' : `Craft ${quantity} × ${r.name}`}
            </button>
          </section>
        </div>
      )}
      {!visiting && tab === 'Decorate' && (
        <>
          <p>
            Choose furniture, then tap or click a spot in your house to preview its placement.
            Removing a piece returns it to your bag.
          </p>
          {h ? (
            <>
              {!inside && <p>Enter your finished house to place furniture.</p>}
              {inside && (
                <p>
                  Floor {(layout?.floors.findIndex((y) => Math.abs(y - p.y) <= 50) ?? -1) + 1} ·{' '}
                  {h.furniture.length}/{layout?.capacity} placed{' '}
                </p>
              )}
              <div className="housing-options">
                {CARPENTRY_RECIPES.filter((r) => r.width > 0).map((r) => (
                  <article key={r.id}>
                    <ItemIcon id={r.id} />
                    <h4>{r.name}</h4>
                    <p>{p.inventory[r.id] ?? 0} owned</p>
                    <button
                      disabled={!inside || pending || h.stage !== 3 || !(p.inventory[r.id] > 0)}
                      onClick={() => onPlace(r.id)}
                    >
                      Place {r.name}
                    </button>
                  </article>
                ))}
              </div>
              <h3>Display loot & equipment</h3>
              <p>
                Placed items leave your bag and return when removed. Identify and unequip gear
                before displaying it.
              </p>
              <div className="housing-options">
                {[
                  ...Object.keys(p.inventory).map((item) => `display:${item}`),
                  ...(p.gear ?? []).map((g) => `gear:${g.id}`),
                ]
                  .flatMap((key) => {
                    try {
                      return [{ key, def: decorationSelection(p, key) }];
                    } catch {
                      return [];
                    }
                  })
                  .map(({ key, def }) => (
                    <article key={key}>
                      <ItemIcon id={def.id} />
                      <h4>{def.gear?.name ?? itemDefinition(def.id)?.name}</h4>
                      <p>
                        {def.gear ? `${def.gear.rarity} equipment` : `${p.inventory[def.id]} owned`}
                      </p>
                      <button
                        disabled={!inside || pending || h.stage !== 3}
                        onClick={() => onPlace(key)}
                      >
                        Display {def.gear?.name ?? itemDefinition(def.id)?.name}
                      </button>
                    </article>
                  ))}
              </div>
              {h.furniture.map((f) => (
                <p key={f.id}>
                  {f.gear?.name ?? itemDefinition(f.item)?.name} · Floor {(f.floor ?? 0) + 1}{' '}
                  <button disabled={!near || pending} onClick={() => act('remove', f.id)}>
                    Return to bag
                  </button>
                </p>
              ))}
            </>
          ) : (
            <p>Claim a plot and finish building your house first.</p>
          )}
        </>
      )}
      {tab === 'Guests' && (
        <>
          <p>
            Your house is private. Invited guests can visit while you are together in this village;
            only you can build and decorate.
          </p>
          {h && !visiting && (
            <>
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
          <h3>Houses you can visit</h3>
          {invitedHomes.map((home) => (
            <p key={home.id}>
              {home.name}{' '}
              <button disabled={inside || !near || pending} onClick={() => act('visit', home.id)}>
                Visit {home.name}'s house
              </button>
            </p>
          ))}
          {!invitedHomes.length && <p>No house invitations yet.</p>}
          <h3>Village adventurers</h3>
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
        </>
      )}
    </section>
  );
}
