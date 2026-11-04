import { useEffect, useRef, useState } from 'react';
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
    ignoreClickUntil = useRef(0),
    carousel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    carousel.current?.focus();
  }, []);
  const index = ISLANDS.findIndex((i) => i.id === selected),
    island = ISLANDS[index],
    chart = WORLD_MAP_ISLANDS.find((i) => i.id === selected)!;
  const move = (direction: number) =>
    setSelected(ISLANDS[(index + direction + ISLANDS.length) % ISLANDS.length].id);
  const crystals = p.inventory[TELEPORT_CRYSTAL] ?? 0,
    atBram = p.mapId === 'village' && nearNpc(p, MAPS.village, 'bram');
  const location = (id: string, label: string, point?: { x: number; y: number }, boss = false) => {
    const blocked = teleportBlock(p, id),
      key = teleportKey(id),
      cost = `1 crystal${key ? ' + 1 key' : ''}`;
    const reason = !MAPS[id]
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
      <div
        key={id}
        className={`map-location ${point ? 'map-hunting-location' : 'map-home-location'} ${boss ? 'boss-location' : ''}`}
        style={point ? { left: `${point.x}%`, top: `${point.y}%` } : undefined}
      >
        <span className="map-monster-name">{label}</span>
        <button
          data-area-id={id}
          className={`map-destination map-circle-button ${point ? 'map-location-button' : ''} ${p.mapId === id ? 'current' : ''}`}
          disabled={!!blocked}
          onClick={() => onTeleport(id)}
          aria-label={`Teleport to ${label}`}
          aria-description={blocked ?? `Costs ${cost}.`}
          title={`${label} · ${blocked ?? cost}`}
        >
          <img src="/assets/ui/teleport-destination.png" alt="" draggable={false} />
        </button>
        <small className="map-location-status">{reason}</small>
      </div>
    );
  };
  return (
    <section className="world-map-panel">
      <div
        className="island-carousel"
        ref={carousel}
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
        <header className="island-carousel-heading">
          <button aria-label="Previous island" onClick={() => move(-1)}>
            ‹
          </button>
          <div aria-live="polite">
            <h2>{island.name}</h2>
            <small>
              Lv. {island.minLevel}–{island.maxLevel} · {index + 1} / {ISLANDS.length}
            </small>
            {!island.available && (
              <p className="map-island-availability">
                {p.unlockedIslands?.includes(island.id)
                  ? 'Access earned · four areas coming next'
                  : 'Coming soon'}
              </p>
            )}
            {island.id === 'crystal' && p.unlockedIslands?.includes('crystal') && (
              <img
                className="map-unlock-badge"
                src="/assets/ui/crystal-unlock.png"
                alt="Crystal Caverns access earned"
                width="24"
                height="24"
              />
            )}
          </div>
          <button aria-label="Next island" onClick={() => move(1)}>
            ›
          </button>
        </header>
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
            alt={`${island.name} island map with four hunting locations`}
            draggable={false}
          />
          <div className="map-area-list">
            {chart.areas.map((_, areaIndex) => {
              const id =
                areaIndex === 0
                  ? island.id
                  : `${island.id}-${areaIndex === 3 ? 'boss' : areaIndex + 1}`;
              return location(
                id,
                areaIndex === 3 ? island.boss : island.monsters[areaIndex],
                chart.locations[areaIndex],
                areaIndex === 3,
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
      <div className="map-travel-toolbar" role="group" aria-label="Map travel controls">
        <div className="map-crystals" title={`${crystals} Teleport Crystals`}>
          <ItemIcon id={TELEPORT_CRYSTAL} />
          <strong>
            {crystals} Teleport Crystal{crystals === 1 ? '' : 's'}
          </strong>
        </div>
        {location('village', 'Elderwood Village')}
        <button
          className="map-crystal-buy"
          disabled={!atBram || p.gold < TELEPORT_CRYSTAL_PRICE}
          onClick={onBuy}
          title={
            atBram ? 'Buy one crystal from Bram' : 'Visit Bram in Elderwood Village to buy crystals'
          }
          aria-label={`Buy Teleport Crystal · ${TELEPORT_CRYSTAL_PRICE} gold`}
        >
          + Crystal <small>{TELEPORT_CRYSTAL_PRICE} gold · Bram</small>
        </button>
      </div>
    </section>
  );
}
