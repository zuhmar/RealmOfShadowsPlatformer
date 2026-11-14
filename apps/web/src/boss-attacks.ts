import frostSlam from '../public/assets/effects/frost-giant-slam.json';
import venomAtlas from '../public/assets/effects/hydra-venom.json';
import { skillEffect } from './combat-effects';
import Phaser from 'phaser';
import { BOSS_ATTACK } from '@ros/game-data';
import type { Wolf, Event } from '@ros/shared';
const venomWidth = (kind: 'warning' | 'impact') =>
  Math.max(
    ...Object.entries(venomAtlas.frames)
      .filter(([name]) => name.startsWith(kind))
      .map(([, entry]) => entry.frame.w),
  );
/** Snapshot-backed warning survives joining mid-windup and never follows a dodging player. */
export class BossWarnings {
  private marks = new Map<
    string,
    {
      area: Phaser.GameObjects.Graphics;
      label: Phaser.GameObjects.Text;
      venom?: Phaser.GameObjects.Sprite;
    }
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
      if (monster.monster === 'frost-giant') {
        mark.area.setVisible(false);
        mark.venom ??= this.scene.add
          .sprite(zone.x, zone.y, 'frost-giant-slam', 'fx-0')
          .setDepth(12)
          .setName('boss-frost-warning');
        mark.venom
          .setFrame(
            `fx-${Math.min(3, Math.floor(((now - zone.startedAt) / BOSS_ATTACK.windup) * 4))}`,
          )
          .setOrigin(0.5, 0.92)
          .setPosition(zone.x, zone.y)
          .setScale((r * 2) / frostSlam.frames['fx-0'].sourceSize.w);
        mark.label
          .setScale(1 / this.scene.cameras.main.zoom)
          .setPosition(zone.x, zone.y - h - 25)
          .setText(`GLACIAL SLAM ${Math.ceil(remaining / 100) / 10}s — MOVE!`);
        continue;
      }
      if (monster.monster === 'hydra') {
        mark.area.setVisible(false);
        mark.venom ??= this.scene.add
          .sprite(zone.x, zone.y, 'hydra-venom', 'warning-0')
          .setDepth(12)
          .setName('boss-venom-warning');
        const frame = Math.min(7, Math.floor(((now - zone.startedAt) / BOSS_ATTACK.windup) * 8));
        mark.venom
          .setFrame(`warning-${frame}`)
          .setOrigin(0.5, 0.83)
          .setPosition(zone.x, zone.y)
          .setScale((r * 2) / venomWidth('warning'));
        mark.label
          .setScale(1 / this.scene.cameras.main.zoom)
          .setPosition(zone.x, zone.y - h - 25)
          .setText(`VENOM ERUPTION ${Math.ceil(remaining / 100) / 10}s — MOVE!`);
        continue;
      }
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
        .setText(
          `${monster.monster === 'crystal-wyrm' ? 'CRYSTAL ERUPTION' : 'GROUND SLAM'} ${Math.ceil(remaining / 100) / 10}s — MOVE!`,
        );
    }
    for (const [id, mark] of this.marks)
      if (!active.has(id)) {
        mark.venom?.destroy();
        mark.area.destroy();
        mark.label.destroy();
        this.marks.delete(id);
      }
  }
}
export function bossImpact(scene: Phaser.Scene, event: Event) {
  if (event.monster === 'frost-giant') {
    if (!scene.anims.exists('frost-giant-impact'))
      scene.anims.create({
        key: 'frost-giant-impact',
        frames: Array.from({ length: 8 }, (_, i) => ({
          key: 'frost-giant-slam',
          frame: `fx-${i}`,
        })),
        frameRate: 14,
        repeat: 0,
      });
    const sprite = scene.add
      .sprite(event.x, event.y, 'frost-giant-slam', 'fx-0')
      .setOrigin(0.5, 0.92)
      .setDepth(18)
      .setName('boss-frost-impact');
    sprite
      .setScale(((event.radius ?? BOSS_ATTACK.radius) * 2) / frostSlam.frames['fx-0'].sourceSize.w)
      .play('frost-giant-impact')
      .once('animationcomplete', () => sprite.destroy());
    return;
  }

  if (event.monster === 'hydra') {
    if (!scene.anims.exists('hydra-venom-impact'))
      scene.anims.create({
        key: 'hydra-venom-impact',
        frames: Array.from({ length: 8 }, (_, i) => ({ key: 'hydra-venom', frame: `impact-${i}` })),
        frameRate: 12,
        repeat: 0,
      });
    const sprite = scene.add
      .sprite(event.x, event.y, 'hydra-venom', 'impact-0')
      .setOrigin(0.5, 0.83)
      .setDepth(18)
      .setName('boss-venom-impact');
    sprite
      .setScale(((event.radius ?? BOSS_ATTACK.radius) * 2) / venomWidth('impact'))
      .play('hydra-venom-impact')
      .once('animationcomplete', () => sprite.destroy());
    return;
  }
  if (event.monster === 'crystal-wyrm') {
    skillEffect(scene, {
      ...event,
      type: 'skill',
      skill: 'staff',
      weapon: 'crystal-staff',
      phase: 'impact',
      y: event.y - 45,
      text: '',
    });
  }
  const r = event.radius ?? BOSS_ATTACK.radius;
  const g = scene.add
    .graphics()
    .setPosition(event.x, event.y)
    .setDepth(18)
    .setName('boss-slam-impact');
  g.fillStyle(event.monster === 'crystal-wyrm' ? 0x52c7ff : 0xff812e, 0.35);
  g.fillRect(-r, -BOSS_ATTACK.height, r * 2, BOSS_ATTACK.height);
  g.lineStyle(5, 0xffedb0, 0.95);
  g.strokeEllipse(0, -5, r * 2, 40);
  if (event.monster === 'crystal-wyrm') {
    for (let x = -r + 12; x < r; x += 35) {
      g.fillStyle(0x42d9f5, 0.9);
      g.fillTriangle(x - 12, 0, x + 12, 0, x + 5, -80);
      g.fillStyle(0xd7fbff, 0.9);
      g.fillTriangle(x - 5, 0, x + 3, 0, x + 5, -72);
    }
    g.setScale(1, 0.2);
    scene.tweens.add({ targets: g, scaleY: 1, duration: 100 });
  } else {
    for (let x = -r + 12; x < r; x += 35) {
      g.lineStyle(8, 0x614020);
      g.lineBetween(x, 0, x - 8, -55);
      g.lineBetween(x - 8, -55, x + 5, -80);
      g.lineStyle(3, 0xb8e56e);
      g.lineBetween(x, 0, x - 8, -55);
    }
  }
  scene.tweens.add({ targets: g, alpha: 0, duration: 650, onComplete: () => g.destroy() });
}
