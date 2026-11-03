import Phaser from 'phaser';
import { BOSS_ATTACK } from '@ros/game-data';
import type { Wolf, Event } from '@ros/shared';
/** Snapshot-backed warning survives joining mid-windup and never follows a dodging player. */
export class BossWarnings {
  private marks = new Map<
    string,
    { area: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text }
  >();
  constructor(private scene: Phaser.Scene) {}
  sync(monsters: Wolf[], now: number) {
    const active = new Set<string>();
    for (const monster of monsters) {
      const zone = monster.hp > 0 ? monster.special : undefined;
      if (!zone) continue;
      active.add(monster.id);
      let mark = this.marks.get(monster.id);
      if (!mark) {
        mark = {
          area: this.scene.add.graphics().setDepth(12).setName('boss-danger-zone'),
          label: this.scene.add
            .text(0, 0, '', {
              fontFamily: 'Arial',
              fontSize: '14px',
              fontStyle: 'bold',
              color: '#fff0d2',
              backgroundColor: '#53121b',
              padding: { x: 6, y: 4 },
            })
            .setOrigin(0.5)
            .setDepth(20)
            .setName('boss-danger-label'),
        };
        this.marks.set(monster.id, mark);
      }
      const r = zone.radius,
        h = BOSS_ATTACK.height,
        remaining = Math.max(0, zone.impactAt - now);
      const g = mark.area;
      g.clear()
        .setPosition(zone.x, zone.y)
        .setData({ radius: r, height: h, impactAt: zone.impactAt });
      g.fillStyle(0xe52b38, 0.22 + Math.sin((now - zone.startedAt) / 100) * 0.07);
      g.fillRect(-r, -h, r * 2, h);
      g.lineStyle(3, 0xffae65, 0.95);
      g.strokeRect(-r, -h, r * 2, h);
      g.lineStyle(3, 0xffdb9b, 0.85);
      for (let x = -r + 12; x < r - 12; x += 30) {
        g.lineBetween(x, -16, x + 9, -7);
        g.lineBetween(x + 9, -7, x + 18, -16);
      }
      g.fillStyle(0xffb45f, 0.9);
      g.fillRect(-r, -h - 6, r * 2 * (remaining / BOSS_ATTACK.windup), 4);
      mark.label
        .setScale(1 / this.scene.cameras.main.zoom)
        .setPosition(zone.x, zone.y - h - 25)
        .setText(`GROUND SLAM ${Math.ceil(remaining / 100) / 10}s — MOVE!`);
    }
    for (const [id, mark] of this.marks)
      if (!active.has(id)) {
        mark.area.destroy();
        mark.label.destroy();
        this.marks.delete(id);
      }
  }
}
export function bossImpact(scene: Phaser.Scene, event: Event) {
  const r = event.radius ?? BOSS_ATTACK.radius;
  const g = scene.add
    .graphics()
    .setPosition(event.x, event.y)
    .setDepth(18)
    .setName('boss-slam-impact');
  g.fillStyle(0xff812e, 0.35);
  g.fillRect(-r, -BOSS_ATTACK.height, r * 2, BOSS_ATTACK.height);
  g.lineStyle(5, 0xffedb0, 0.95);
  g.strokeEllipse(0, -5, r * 2, 40);
  for (let x = -r + 12; x < r; x += 35) {
    g.lineStyle(8, 0x614020);
    g.lineBetween(x, 0, x - 8, -55);
    g.lineBetween(x - 8, -55, x + 5, -80);
    g.lineStyle(3, 0xb8e56e);
    g.lineBetween(x, 0, x - 8, -55);
  }
  scene.tweens.add({ targets: g, alpha: 0, duration: 650, onComplete: () => g.destroy() });
}
