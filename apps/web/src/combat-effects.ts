import Phaser from 'phaser';
import type { Event } from '@ros/shared';

export function skillEffect(scene: Phaser.Scene, event: Event) {
  const effect = scene.add
    .graphics()
    .setPosition(event.x, event.y)
    .setDepth(18)
    .setName('weapon-skill-effect');
  effect.setScale(event.facing ?? 1, 1);
  effect.lineStyle(5, 0xdca9ff, 0.95);
  if (event.skill === 'sword' || event.skill === 'unarmed') {
    effect.beginPath();
    effect.arc(0, 0, 105, -1.1, 1.1);
    effect.strokePath();
    effect.lineStyle(2, 0xffedff);
    effect.beginPath();
    effect.arc(0, 0, 90, -1.1, 1.1);
    effect.strokePath();
  } else if (event.skill === 'bow') {
    effect.lineBetween(15, 0, 80, 0);
    effect.lineBetween(60, -10, 80, 0);
    effect.lineBetween(60, 10, 80, 0);
  } else if (event.skill === 'staff') {
    const radius = event.phase === 'impact' ? 140 : 28;
    effect.fillStyle(0xa352f4, 0.16);
    effect.fillEllipse(0, 0, radius * 2, radius);
    effect.strokeEllipse(0, 0, radius * 2, radius);
    effect.lineStyle(2, 0xf6e3ff);
    effect.strokeEllipse(0, 0, radius * 1.6, radius * 0.8);
  } else {
    for (let i = 0; i < 3; i++)
      effect.lineBetween(12 + i * 12, -22 + i * 6, 46 + i * 12, 17 + i * 6);
  }
  scene.tweens.add({
    targets: effect,
    alpha: 0,
    duration: event.skill === 'staff' ? 450 : 260,
    onComplete: () => effect.destroy(),
  });
}
