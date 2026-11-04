import { useState } from 'react';
import {
  identifyCost,
  formatGearAttribute,
  compareGear,
  gearSellValue,
  GEAR_RARITIES,
  GEAR_RARITY_COLORS,
  nearNpc,
  type GearAttribute,
  type Player,
  type GearRarity,
} from '@ros/shared';
import { MAPS, equipmentDefinition, itemDefinition, type EquipmentSlot } from '@ros/game-data';
import { ItemIcon } from './ItemIcon';
const slots: { id: EquipmentSlot; label: string }[] = [
  { id: 'weapon', label: 'Weapon' },
  { id: 'helmet', label: 'Helmet' },
  { id: 'armor', label: 'Chestplate' },
  { id: 'legs', label: 'Leggings' },
  { id: 'boots', label: 'Boots' },
];
export function EquipmentPanel({
  player: p,
  send,
}: {
  player: Player;
  send: (type: string, id: string) => void;
}) {
  const [rarity, setRarity] = useState('All'),
    [confirmSale, setConfirmSale] = useState<string | null>(null);
  const atBram = p.mapId === 'village' && nearNpc(p, MAPS.village, 'bram');
  const visible = (p.gear ?? []).filter((g) => rarity === 'All' || g.rarity === rarity);
  return (
    <section className="equipment-panel">
      <h3>Equipped gear</h3>
      <div className="equipped-slots" aria-label="Equipped equipment">
        {slots.map((slot) => {
          const g = p.gear?.find((g) => g.id === p.equippedGear?.[slot.id]);
          const base = slot.id === 'weapon' ? p.weapon : g?.base;
          return (
            <div className="equipped-slot" key={slot.id}>
              <small>{slot.label}</small>
              <span aria-hidden="true">{base && <ItemIcon id={base} />}</span>
              <strong>{g?.name ?? itemDefinition(base)?.name ?? 'Empty'}</strong>
            </div>
          );
        })}
        <div className="equipped-slot">
          <small>Accessory</small>
          <strong>{itemDefinition(p.accessory)?.name ?? 'Empty'}</strong>
        </div>
      </div>
      <h3>Equipment & identification</h3>
      <p>
        Uncommon, Rare, Epic and Legendary monster drops reveal 1, 2, 3 or 4 attributes at Bram.
        Crafted equipment has fixed stats and is ready to equip. Sell unwanted, unequipped gear to
        Bram.
      </p>
      <label className="gear-filter">
        Rarity
        <select
          aria-label="Filter equipment rarity"
          value={rarity}
          onChange={(e) => {
            setRarity(e.target.value);
            setConfirmSale(null);
          }}
        >
          {['All', 'Common', ...GEAR_RARITIES].map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <p className="gear-count" role="status">
        Showing {visible.length} of {p.gear?.length ?? 0} equipment pieces
      </p>
      {!p.gear?.length && <p>Monsters have a 10% gear chance; Forest Bear always drops one.</p>}
      {!!p.gear?.length && !visible.length && <p>No equipment matches this rarity.</p>}
      <div className="skills-grid">
        {visible.map((g) => {
          const equipped = p.equippedGear?.[g.slot] === g.id;
          const comparison = compareGear(p, g);
          const current = p.gear?.find((other) => other.id === p.equippedGear?.[g.slot]);
          const comparedName =
            current?.name ??
            (g.slot === 'weapon' ? itemDefinition(p.weapon)?.name : null) ??
            'empty slot';
          return (
            <article
              className={`training-card gear-card ${equipped ? 'gear-equipped' : ''}`}
              data-rarity={g.rarity}
              key={g.id}
              style={{ borderColor: GEAR_RARITY_COLORS[g.rarity as GearRarity] }}
            >
              <h4>
                <span aria-hidden="true">
                  {equipmentDefinition(g.base) || g.slot === 'weapon' ? (
                    <ItemIcon id={g.base} />
                  ) : (
                    <span>🛡</span>
                  )}
                </span>{' '}
                {g.name}
              </h4>
              <p>
                {g.rarity} · {g.slot} · Lv. {g.level} ·{' '}
                {g.source === 'crafted'
                  ? 'Crafted · Fixed stats'
                  : g.identified
                    ? 'Identified monster drop'
                    : 'Unidentified monster drop'}
                {equipped ? ' · Equipped' : ''}
              </p>
              {g.identified ? (
                <>
                  <ul>
                    {Object.entries(g.attributes ?? {}).map(([key, value]) => (
                      <li key={key}>{formatGearAttribute(key as GearAttribute, value)}</li>
                    ))}
                  </ul>
                  {!equipped && p.level >= g.level && (
                    <div className="gear-comparison" aria-label={`Compare ${g.name}`}>
                      <p>Compared with {comparedName}</p>
                      {comparison.length ? (
                        <ul>
                          {comparison.map((row) => (
                            <li
                              key={row.stat}
                              className={row.difference > 0 ? 'stat-gain' : 'stat-loss'}
                            >
                              {row.name} {row.difference > 0 ? '+' : '−'}
                              {(Math.abs(row.difference) * (row.percent ? 100 : 1)).toFixed(1)}
                              {row.percent ? '%' : ''}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No stat change.</p>
                      )}
                    </div>
                  )}
                  {p.level < g.level && <p>Requires character Lv. {g.level}.</p>}
                  <button disabled={p.level < g.level} onClick={() => send('equipGear', g.id)}>
                    {equipped ? 'Unequip' : 'Equip'} {g.name}
                  </button>
                </>
              ) : (
                <>
                  <p>Identify to reveal and compare hidden attributes.</p>
                  <p>
                    {atBram
                      ? `Bram’s fee: ${identifyCost(g)} gold`
                      : 'Visit Bram in Elderwood Village to identify.'}
                  </p>
                  <button
                    disabled={!atBram || p.gold < identifyCost(g)}
                    onClick={() => send('identify', g.id)}
                  >
                    Identify {g.name} · {identifyCost(g)} gold
                  </button>
                </>
              )}
              <div className="gear-sale">
                {confirmSale === g.id ? (
                  <>
                    <p>
                      Sell {g.name} for {gearSellValue(g)} gold? This removes the item.
                    </p>
                    <button
                      disabled={!atBram || equipped}
                      onClick={() => {
                        send('sellGear', g.id);
                        setConfirmSale(null);
                      }}
                    >
                      Confirm sale · {gearSellValue(g)} gold
                    </button>
                    <button onClick={() => setConfirmSale(null)}>Cancel sale</button>
                  </>
                ) : (
                  <button disabled={!atBram || equipped} onClick={() => setConfirmSale(g.id)}>
                    Sell to Bram · {gearSellValue(g)} gold
                  </button>
                )}
                {equipped ? (
                  <small>Unequip before selling.</small>
                ) : !atBram ? (
                  <small>Visit Bram to sell.</small>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
