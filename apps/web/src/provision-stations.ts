import Phaser from 'phaser';
export function provisionStation(scene: Phaser.Scene, x: number, y: number, cooking: boolean) {
  const c = scene.add.container(x, y),
    g = scene.add.graphics();
  c.add(g);
  if (cooking) {
    g.lineStyle(7, 0x493128).lineBetween(-28, -2, 24, -2);
    g.lineStyle(4, 0x9c6c3d).lineBetween(-28, -3, 24, -3);
    g.fillStyle(0xe96537).fillTriangle(-16, -3, 1, -40, 17, -3);
    g.fillStyle(0xf9cd67).fillTriangle(-9, -3, 2, -25, 10, -3);
    g.fillStyle(0x2d3048).fillRoundedRect(-24, -35, 48, 24, 8);
    g.fillStyle(0x565f76).fillEllipse(0, -34, 49, 13);
    g.fillStyle(0xc9ab66).fillEllipse(0, -35, 38, 7);
    g.lineStyle(2, 0xc8e6de, 0.8).lineBetween(-9, -45, -5, -55);
    g.lineBetween(8, -45, 11, -59);
  } else {
    g.fillStyle(0x3f2c2b).fillRoundedRect(-32, -35, 64, 10, 3);
    g.fillStyle(0xad7a48).fillRect(-29, -33, 58, 5);
    g.fillStyle(0x795232).fillRect(-26, -25, 7, 25);
    g.fillRect(19, -25, 7, 25);
    for (const [vx, color] of [
      [-14, 0xe87093],
      [12, 0x75b9e2],
    ]) {
      g.fillStyle(0xc1d4da).fillRect(vx - 4, -59, 8, 10);
      g.fillStyle(0x354352).fillCircle(vx, -44, 11);
      g.fillStyle(color).fillCircle(vx, -43, 8);
      g.fillStyle(0xf2ffff, 0.7).fillEllipse(vx - 3, -47, 3, 7);
    }
  }
  return c.setName(cooking ? 'cooking-station' : 'alchemy-station');
}
