import { useRef, useState } from 'react';
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
  const [selected, setSelected] = useState(
    () => ISLANDS.find((i) => p.mapId === i.id || p.mapId.startsWith(`${i.id}-`))?.id ?? 'woods',
  );
  const swipe = useRef<{ x: number; y: number } | null>(null),
    ignoreClickUntil = useRef(0);
  const index = ISLANDS.findIndex((i) => i.id === selected),
    island = ISLANDS[index],
    chart = WORLD_MAP_ISLANDS.find((i) => i.id === selected)!;
  const move = (direction: number) =>
    setSelected(ISLANDS[(index + direction + ISLANDS.length) % ISLANDS.length].id);
  const crystals = p.inventory[TELEPORT_CRYSTAL] ?? 0,
    atBram = p.mapId === 'village' && nearNpc(p, MAPS.village, 'bram');
  const areaButton = (
    id: string,
    name: string,
    detail: string,
    point?: { x: number; y: number },
    number?: number,
  ) => {
    const blocked = teleportBlock(p, id),
      key = teleportKey(id),
      cost = `1 crystal${key ? ' + 1 boss key' : ''}`;
    const shortReason = !MAPS[id]
      ? 'Coming soon'
      : p.mapId === id
        ? 'You are here'
        : blocked?.includes('level')
          ? `Lv. ${MAPS[id].requiredLevel} required`
          : !p.visitedAreas?.includes(id)
            ? 'Visit first'
            : blocked?.includes('boss key')
              ? 'Key required'
              : blocked
                ? 'No crystals'
                : cost;
    return (
      <button
        key={id}
        data-area-id={id}
        className={`map-destination ${point ? 'map-location-button' : ''} ${number === 4 ? 'boss-location' : ''} ${p.mapId === id ? 'current' : ''}`}
        style={point ? { left: `${point.x}%`, top: `${point.y}%` } : undefined}
        disabled={!!blocked}
        onClick={() => onTeleport(id)}
        aria-label={`Teleport to ${name}`}
        aria-description={`${detail}. ${blocked ?? `Teleport for ${cost}.`}`}
        title={`${name} · ${detail} · ${blocked ?? cost}`}
      >
        {point && (
          <span className="map-location-number" aria-hidden="true">
            {number === 4 ? '◆' : number}
          </span>
        )}
        <strong>{name}</strong>
        <span className={point ? 'map-location-detail' : ''}>{detail}</span>
        <small>{point ? shortReason : (blocked ?? `Teleport · ${cost}`)}</small>
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
        Swipe or use the arrows to explore each island. Click a hunting location on its map to
        teleport for one crystal. Visit areas through portals first; boss entry also requires a key.
      </p>
      <div
        className="island-carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label="Island maps"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            move(e.key === 'ArrowRight' ? 1 : -1);
          }
        }}
      >
        <div className="island-carousel-heading">
          <button aria-label="Previous island" onClick={() => move(-1)}>
            ‹
          </button>
          <div aria-live="polite">
            <h3>{island.name}</h3>
            <small>
              Lv. {island.minLevel}–{island.maxLevel} · {index + 1} / {ISLANDS.length}
            </small>
          </div>
          <button aria-label="Next island" onClick={() => move(1)}>
            ›
          </button>
        </div>
        <div
          className="world-map-chart island-map-slide"
          style={{ aspectRatio: `${chart.width} / ${chart.height}` }}
          role="group"
          aria-roledescription="slide"
          aria-label={`${island.name} hunting locations`}
          onTouchStart={(e) => {
            if (e.touches.length !== 1) {
              swipe.current = null;
              return;
            }
            swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }}
          onTouchCancel={() => {
            swipe.current = null;
          }}
          onTouchEnd={(e) => {
            const start = swipe.current;
            swipe.current = null;
            if (!start || !e.changedTouches.length) return;
            const dx = e.changedTouches[0].clientX - start.x,
              dy = e.changedTouches[0].clientY - start.y;
            if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
              ignoreClickUntil.current = Date.now() + 450;
              move(dx < 0 ? 1 : -1);
            }
          }}
          onClickCapture={(e) => {
            if (Date.now() < ignoreClickUntil.current) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <img
            key={chart.id}
            src={chart.image}
            alt={`${island.name} island map with three empty hunting locations and a boss entrance`}
            draggable={false}
          />
          <div className="map-area-list">
            {chart.areas.map((_, areaIndex) => {
              const id =
                areaIndex === 0
                  ? island.id
                  : `${island.id}-${areaIndex === 3 ? 'boss' : areaIndex + 1}`;
              return areaButton(
                id,
                areaIndex === 3 ? 'Boss Entrance' : `Hunting Area ${areaIndex + 1}`,
                areaIndex === 3 ? 'Boss location' : 'Hunting location',
                chart.locations[areaIndex],
                areaIndex + 1,
              );
            })}
          </div>
        </div>
        <nav className="map-carousel-pagination" aria-label="Choose island">
          {ISLANDS.map((entry, i) => (
            <button
              className={`map-carousel-dot ${selected === entry.id ? 'selected' : ''}`}
              key={entry.id}
              onClick={() => setSelected(entry.id)}
              aria-label={`Explore ${entry.name}`}
              aria-pressed={selected === entry.id}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      </div>
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
            : 'Island not open yet. Its hunting locations are shown on the map.'}
        </p>
      )}
      <div className="map-hub">
        {areaButton('village', 'Elderwood Village', 'Safe hub · Mira · Bram')}
      </div>
      <div className="map-crystal-shop">
        <h3>More Teleport Crystals</h3>
        <p>
          Three starter crystals per character. Monsters have a 5% chance to drop one. Buy more from
          Bram for {TELEPORT_CRYSTAL_PRICE} gold each. Walking through normal portals stays free.
        </p>
        <button disabled={!atBram || p.gold < TELEPORT_CRYSTAL_PRICE} onClick={onBuy}>
          Buy Teleport Crystal · {TELEPORT_CRYSTAL_PRICE} gold
        </button>
        {!atBram && <small>Stand next to Bram in Elderwood Village to buy.</small>}
      </div>
    </section>
  );
}
