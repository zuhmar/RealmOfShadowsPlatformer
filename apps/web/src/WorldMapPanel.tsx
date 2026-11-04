import { useState } from 'react';
import {
  ISLANDS,
  MAPS,
  WORLD_MAP_ISLANDS,
  TELEPORT_CRYSTAL,
  TELEPORT_CRYSTAL_PRICE,
} from '@ros/game-data';
import { teleportBlock, teleportKey, nearNpc, type Player } from '@ros/shared';
import { ItemIcon } from './ItemIcon';
export function WorldMapPanel({
  player: p,
  onTeleport,
  onBuy,
}: {
  player: Player;
  onTeleport: (id: string) => void;
  onBuy: () => void;
}) {
  const [selected, setSelected] = useState('woods');
  const island = ISLANDS.find((i) => i.id === selected)!;
  const chart = WORLD_MAP_ISLANDS.find((i) => i.id === selected)!;
  const crystals = p.inventory[TELEPORT_CRYSTAL] ?? 0;
  const atBram = p.mapId === 'village' && nearNpc(p, MAPS.village, 'bram');
  const areaButton = (id: string, name: string, detail: string) => {
    const blocked = teleportBlock(p, id),
      key = teleportKey(id);
    return (
      <button
        key={id}
        className={`map-destination ${p.mapId === id ? 'current' : ''}`}
        disabled={!!blocked}
        onClick={() => onTeleport(id)}
        aria-label={`Teleport to ${name}`}
      >
        <strong>{name}</strong>
        <span>{detail}</span>
        <small>{blocked ?? `Teleport · 1 crystal${key ? ' + 1 boss key' : ''}`}</small>
      </button>
    );
  };
  return (
    <section className="world-map-panel">
      <div className="map-crystals">
        <ItemIcon id={TELEPORT_CRYSTAL} />
        <strong>
          {crystals} Teleport Crystal{crystals === 1 ? '' : 's'}
        </strong>
      </div>
      <p>
        Choose an island, then click a visited area to teleport for one crystal. Walk through
        portals to discover areas first. Boss entry also consumes its key. Walking through normal
        portals stays free.
      </p>
      <div className="world-map-chart" aria-label="Seven island world map">
        <img
          src="/assets/backgrounds/world-map.png"
          alt="Realm of Shadows world: forests, crystal caverns, swamp, tundra, volcanic peaks, celestial temples and the Shadow Dragon fortress"
          draggable={false}
        />
        {WORLD_MAP_ISLANDS.map((entry, index) => {
          const data = ISLANDS.find((i) => i.id === entry.id)!;
          return (
            <button
              key={entry.id}
              className={`map-island-marker ${entry.id === selected ? 'selected' : ''}`}
              style={{ left: `${entry.x}%`, top: `${entry.y}%` }}
              onClick={() => setSelected(entry.id)}
              aria-label={`Explore ${data.name}`}
              aria-pressed={entry.id === selected}
            >
              <span aria-hidden="true">{index + 1}</span>
              <strong>{data.name}</strong>
              <small aria-hidden="true">● ● ● ◆</small>
            </button>
          );
        })}
      </div>
      <div className="map-hub">
        {areaButton('village', 'Elderwood Village', 'Safe hub · Mira · Bram')}
      </div>
      <h3>
        {island.name}{' '}
        <small>
          Lv. {island.minLevel}–{island.maxLevel}
        </small>
      </h3>
      {island.id === 'crystal' && p.unlockedIslands?.includes('crystal') && (
        <img
          src="/assets/ui/crystal-unlock.png"
          alt="Crystal Caverns access earned"
          width="42"
          height="42"
          style={{ objectFit: 'contain' }}
        />
      )}
      {!island.available && (
        <p>
          {p.unlockedIslands?.includes(island.id)
            ? 'Access earned · four areas coming next'
            : 'Island not open yet. Its four hunting areas are shown below.'}
        </p>
      )}
      <div className="map-area-list">
        {chart.areas.map((name, index) => {
          const id = index === 0 ? island.id : `${island.id}-${index === 3 ? 'boss' : index + 1}`;
          const detail =
            index === 3
              ? `Boss · ${island.boss}`
              : `Hunting area ${index + 1} · ${island.monsters[index]}`;
          return areaButton(id, name, detail);
        })}
      </div>
      <div className="map-crystal-shop">
        <h3>More Teleport Crystals</h3>
        <p>
          Three starter crystals per character. Monsters have a 5% chance to drop one. Buy more from
          Bram for {TELEPORT_CRYSTAL_PRICE} gold each.
        </p>
        <button disabled={!atBram || p.gold < TELEPORT_CRYSTAL_PRICE} onClick={onBuy}>
          Buy Teleport Crystal · {TELEPORT_CRYSTAL_PRICE} gold
        </button>
        {!atBram && <small>Stand next to Bram in Elderwood Village to buy.</small>}
      </div>
    </section>
  );
}
