import { useState } from 'react';
import {
  CHEST_CAPACITY,
  storageChest,
  storageSlots,
  GEAR_RARITY_COLORS,
  type Player,
} from '@ros/shared';
import { itemDefinition } from '@ros/game-data';
import { bagStacks, type BagStack } from './bag-items';
import { HousePopup } from './HousePopup';
import { ItemIcon } from './ItemIcon';
export function StoragePanel({
  player: p,
  chestId,
  send,
  onClose,
}: {
  player: Player;
  chestId?: string;
  send: (type: string, data: unknown) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<{ side: 'Bag' | 'Chest'; key: string }>();
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const chest = p.housing?.furniture.find(
    (f) => f.id === chestId && f.item === 'oak-chest' && !f.display,
  );
  const stored = chest?.storage ?? { items: {}, gear: [] };
  let near = false;
  try {
    storageChest(p, chestId ?? '');
    near = true;
  } catch {
    /* Server also verifies proximity. */
  }
  const stacks = {
    Bag: bagStacks(p),
    Chest: bagStacks({ inventory: stored.items, gear: stored.gear }),
  };
  const selection = selected && stacks[selected.side].find((s) => s.key === selected.key);
  const gearFor = (side: 'Bag' | 'Chest', s: BagStack) =>
    (side === 'Bag' ? p.gear : stored.gear)?.find((g) => g.id === s.gearIds?.[0]);
  const gear = selected && selection ? gearFor(selected.side, selection) : undefined;
  const name = selection
    ? gear
      ? gear.identified
        ? gear.name
        : 'Unidentified equipment'
      : (itemDefinition(selection.item)?.name ?? selection.item)
    : '';
  const transfer = () => {
    if (!selected || !selection || pending || !near) return;
    send('housing', {
      action: selected.side === 'Bag' ? 'deposit' : 'withdraw',
      id: chestId,
      item: gear ? `gear:${gear.id}` : selection.item,
      quantity: gear ? 1 : Math.min(quantity, selection.quantity),
    });
    setPending(true);
    setTimeout(() => setPending(false), 800);
    setSelected(undefined);
  };
  return (
    <HousePopup title="Chest storage" onClose={onClose}>
      {!chest || p.houseOwnerId !== p.id ? (
        <p>Enter your house and click a placed chest.</p>
      ) : (
        <>
          <p className="storage-caption">
            {storageSlots(stored)}/{CHEST_CAPACITY} spaces used · Private storage
          </p>
          {!near && <p>Walk closer to this chest to transfer items.</p>}
          {(['Bag', 'Chest'] as const).map((side) => (
            <section key={side} aria-label={`${side} items`}>
              <h3 className="bag-inventory-title">
                {side}
                <small>{stacks[side].length} stacks</small>
              </h3>
              <div className="bag-slots">
                {Array.from(
                  {
                    length:
                      side === 'Chest'
                        ? Math.max(40, stacks[side].length)
                        : Math.max(24, Math.ceil(stacks[side].length / 8) * 8),
                  },
                  (_, i) => {
                    const s = stacks[side][i],
                      g = s && gearFor(side, s);
                    const label = s
                      ? `${g ? (g.identified ? g.name : 'Unidentified equipment') : (itemDefinition(s.item)?.name ?? s.item)}, ${s.quantity}`
                      : `Empty ${side.toLowerCase()} slot`;
                    return (
                      <button
                        key={s?.key ?? i}
                        className={`bag-slot ${selected?.side === side && selected.key === s?.key ? 'selected' : ''}`}
                        disabled={!s || pending}
                        aria-label={label}
                        title={label}
                        style={{
                          borderColor: g?.identified ? GEAR_RARITY_COLORS[g.rarity] : undefined,
                        }}
                        onClick={() => {
                          if (s) {
                            setSelected({ side, key: s.key });
                            setQuantity(1);
                          }
                        }}
                      >
                        {s && (
                          <>
                            <ItemIcon id={s.item} />
                            <b>{s.quantity}</b>
                            {g && !g.identified && <span className="bag-unidentified">?</span>}
                          </>
                        )}
                      </button>
                    );
                  },
                )}
              </div>
            </section>
          ))}
          {selection && selected && (
            <div
              className="bag-item-backdrop"
              onPointerDown={(e) => {
                e.stopPropagation();
                if (e.target === e.currentTarget) setSelected(undefined);
              }}
            >
              <HousePopup title={name} onClose={() => setSelected(undefined)}>
                <div className="bag-item-icon">
                  <ItemIcon id={selection.item} />
                </div>
                <p>
                  {selection.quantity} available ·{' '}
                  {selected.side === 'Bag' ? 'Move to chest' : 'Move to bag'}
                </p>
                {!gear && (
                  <label>
                    Quantity{' '}
                    <input
                      aria-label="Transfer quantity"
                      type="number"
                      min="1"
                      max={selection.quantity}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(
                          Math.max(
                            1,
                            Math.min(selection.quantity, Math.floor(Number(e.target.value) || 1)),
                          ),
                        )
                      }
                    />
                  </label>
                )}
                <div className="storage-actions">
                  {!gear && <button onClick={() => setQuantity(selection.quantity)}>Max</button>}
                  <button disabled={!near || pending} onClick={transfer}>
                    {selected.side === 'Bag' ? 'Deposit' : 'Withdraw'}{' '}
                    {gear ? 'equipment' : Math.min(quantity, selection.quantity)}
                  </button>
                </div>
              </HousePopup>
            </div>
          )}
        </>
      )}
    </HousePopup>
  );
}
