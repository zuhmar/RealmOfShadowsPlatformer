import { identifyCost, formatGearAttribute, type GearAttribute, type Player } from '@ros/shared';
import { nearNpc } from '@ros/shared';
import { MAPS, equipmentDefinition } from '@ros/game-data';
import { ItemIcon } from './ItemIcon';
export function EquipmentPanel({
  player: p,
  send,
}: {
  player: Player;
  send: (type: string, id: string) => void;
}) {
  const atBram = p.mapId === 'village' && nearNpc(p, MAPS.village, 'bram');
  return (
    <section className="equipment-panel">
      <h3>Equipment & identification</h3>
      <p>
        Uncommon, Rare, Epic and Legendary gear reveal 1, 2, 3 or 4 attributes. Bring gear to Bram
        to identify monster drops once. Crafted equipment has fixed stats and is ready to equip
        without identification.
      </p>
      {!p.gear?.length && (
        <p>
          Hunt for unidentified weapons and armor: monsters have a 10% gear chance; Forest Bear
          always drops one.
        </p>
      )}
      <div className="skills-grid">
        {p.gear?.map((g) => (
          <article className="training-card gear-card" data-rarity={g.rarity} key={g.id}>
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
            </p>
            {g.identified ? (
              <>
                <ul>
                  {Object.entries(g.attributes ?? {}).map(([key, value]) => (
                    <li key={key}>{formatGearAttribute(key as GearAttribute, value)}</li>
                  ))}
                </ul>
                <button disabled={p.level < g.level} onClick={() => send('equipGear', g.id)}>
                  {p.equippedGear?.[g.slot] === g.id ? 'Unequip' : 'Equip'} {g.name}
                </button>
              </>
            ) : (
              <>
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
          </article>
        ))}
      </div>
    </section>
  );
}
