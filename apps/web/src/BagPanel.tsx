import { useEffect, useRef, useState } from 'react';
import { itemDefinition, provisionRecipe, type EquipmentSlot } from '@ros/game-data';
import { GEAR_RARITY_COLORS, type Player } from '@ros/shared';
import { ClassSprite } from './ClassSprite';
import { ItemIcon } from './ItemIcon';
import { ControlIcon } from './ControlIcon';
import { EquipmentPanel } from './EquipmentPanel';
import { bagStacks } from './bag-items';
const slots = [
  ['helmet', 'Head'],
  ['armor', 'Chest'],
  ['legs', 'Legs'],
  ['weapon', 'Weapon'],
  ['boots', 'Feet'],
  ['accessory', 'Accessory'],
] as const;
export function BagPanel({
  player: p,
  time,
  pending,
  onUse,
  send,
  onClose,
}: {
  player: Player;
  time: number;
  pending: boolean;
  onUse: (id: string) => void;
  send: (type: string, value: unknown) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<{ item?: string; gearId?: string }>({}),
    dialog = useRef<HTMLElement>(null),
    itemDialog = useRef<HTMLElement>(null),
    hasDetails = useRef(false),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (hasDetails.current) setSelected({});
        else close.current();
      }
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('keydown', escape);
      old?.focus();
    };
  }, []);
  const stacks = bagStacks(p),
    gear = p.gear?.find((g) => g.id === selected.gearId),
    item = selected.item ? itemDefinition(selected.item) : undefined,
    detailsOpen = !!(gear || item);
  hasDetails.current = detailsOpen;
  useEffect(() => {
    if (!detailsOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    itemDialog.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
      else dialog.current?.focus();
    };
  }, [detailsOpen]);
  useEffect(() => {
    if (dialog.current && !dialog.current.contains(document.activeElement))
      (detailsOpen ? itemDialog.current : dialog.current)?.focus();
  }, [gear?.id, item?.id]);
  return (
    <div className="bag-backdrop" onPointerDown={(e) => e.stopPropagation()}>
      <section
        ref={dialog}
        className="bag-view"
        role="dialog"
        aria-modal={!detailsOpen}
        aria-label="Your bag"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            if (detailsOpen) setSelected({});
            else onClose();
          }
          if (e.key === 'Tab') {
            const nodes = Array.from(
                (detailsOpen ? itemDialog.current : dialog.current)?.querySelectorAll<HTMLElement>(
                  'button:not(:disabled),[tabindex="0"]',
                ) ?? [],
              ),
              first = nodes[0],
              last = nodes.at(-1);
            if (
              e.shiftKey &&
              (document.activeElement === first ||
                document.activeElement === (detailsOpen ? itemDialog.current : dialog.current))
            ) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
          e.stopPropagation();
        }}
      >
        <div inert={detailsOpen}>
          <button className="bag-close" aria-label="Close bag" onClick={onClose}>
            <ControlIcon name="close" />
          </button>
          <header className="bag-heading">
            <h2>{p.name}’s Bag</h2>
            <p>
              Level {p.level} · ◈ {p.gold.toLocaleString()} gold
            </p>
          </header>
          <div className="bag-paperdoll" aria-label="Player and equipped items">
            <div className="bag-player">
              <ClassSprite
                skin={p.skin ?? null}
                appearance={p.appearance}
                outfit={p.outfit}
                armedPreview
                weapon={p.weapon}
                player={p}
              />
            </div>
            {slots.map(([id, label], i) => {
              const g = p.gear?.find((g) => g.id === p.equippedGear?.[id as EquipmentSlot]);
              const base = id === 'weapon' ? p.weapon : id === 'accessory' ? p.accessory : g?.base;
              return (
                <button
                  key={id}
                  className="bag-equipped"
                  style={{
                    gridColumn: i < 3 ? 1 : 3,
                    gridRow: (i % 3) + 1,
                    borderColor: g?.identified ? GEAR_RARITY_COLORS[g.rarity] : undefined,
                  }}
                  aria-label={`${label}: ${g?.name ?? itemDefinition(base)?.name ?? 'Empty'}`}
                  onClick={() => setSelected(g ? { gearId: g.id } : { item: base ?? undefined })}
                >
                  <small>{label}</small>
                  {base ? <ItemIcon id={base} /> : <span className="bag-empty">◇</span>}
                  <span>{g?.name ?? itemDefinition(base)?.name ?? 'Empty'}</span>
                </button>
              );
            })}
          </div>
          <h3 className="bag-inventory-title">
            Inventory <small>{stacks.length} stacks</small>
          </h3>
          <div className="bag-slots" aria-label="Inventory slots">
            {Array.from({ length: Math.max(24, Math.ceil(stacks.length / 6) * 6) }, (_, i) => {
              const s = stacks[i],
                g = s?.gearIds ? p.gear?.find((g) => g.id === s.gearIds![0]) : undefined;
              return (
                <button
                  key={s?.key ?? `empty-${i}`}
                  className={`bag-slot ${s && ((g && selected.gearId === g.id) || (!g && selected.item === s.item)) ? 'selected' : ''}`}
                  disabled={!s}
                  aria-label={
                    s
                      ? `${g?.name ?? itemDefinition(s.item)?.name ?? s.item}, ${s.quantity}${g ? (g.identified ? `, ${g.rarity}` : ', unidentified') : ''}`
                      : 'Empty inventory slot'
                  }
                  style={{ borderColor: g?.identified ? GEAR_RARITY_COLORS[g.rarity] : undefined }}
                  onClick={() => s && setSelected(g ? { gearId: g.id } : { item: s.item })}
                >
                  {s && (
                    <>
                      <ItemIcon id={s.item} />
                      <b>{s.quantity.toLocaleString()}</b>
                      {g && !g.identified && <span className="bag-unidentified">?</span>}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {detailsOpen && (
          <div
            className="bag-item-backdrop"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setSelected({});
            }}
          >
            <section
              ref={itemDialog}
              className="bag-details bag-item-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Item details"
              tabIndex={-1}
            >
              <button
                className="bag-item-close"
                aria-label="Close item details"
                onClick={() => setSelected({})}
              >
                <ControlIcon name="close" />
              </button>
              <div className="bag-item-icon">
                <ItemIcon id={gear?.base ?? item?.id ?? null} />
              </div>
              {gear ? (
                <EquipmentPanel player={p} send={(type, id) => send(type, id)} gearId={gear.id} />
              ) : item ? (
                <>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  {provisionRecipe(item.id) && (
                    <button
                      disabled={
                        pending ||
                        (p.inventory[item.id] ?? 0) < 1 ||
                        (item.type === 'potion' && (p.potionReadyAt ?? 0) > time)
                      }
                      onClick={() => onUse(item.id)}
                    >
                      {item.type === 'food' ? 'Eat' : 'Drink'} {item.name}
                    </button>
                  )}
                  {item.type === 'weapon' && (
                    <button
                      disabled={p.weapon !== item.id && (p.inventory[item.id] ?? 0) < 1}
                      onClick={() => send('equip', p.weapon === item.id ? null : item.id)}
                    >
                      {p.weapon === item.id ? 'Unequip' : 'Equip'} {item.name}
                    </button>
                  )}
                  {item.id === 'forest-guardian-ring' && (
                    <button
                      disabled={p.accessory !== item.id && (p.inventory[item.id] ?? 0) < 1}
                      onClick={() =>
                        send('equipAccessory', p.accessory === item.id ? null : item.id)
                      }
                    >
                      {p.accessory === item.id ? 'Unequip' : 'Equip'} {item.name}
                    </button>
                  )}
                </>
              ) : null}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
