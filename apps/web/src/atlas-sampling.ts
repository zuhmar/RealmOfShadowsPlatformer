import type Phaser from 'phaser';
const guarded = new WeakSet<Phaser.Textures.Texture>();
/** Linear filtering must sample the pose's texels, not its neighbor's gutter. */
export function guardAtlasSampling(texture: Phaser.Textures.Texture) {
  if (guarded.has(texture) || texture.frameTotal < 2) return;
  for (const name of texture.getFrameNames()) {
    const f = texture.get(name);
    if (f.rotated) continue;
    f.setUVs(
      f.cutWidth,
      f.cutHeight,
      (f.cutX + 0.5) / f.source.width,
      (f.cutY + 0.5) / f.source.height,
      (f.cutX + f.cutWidth - 0.5) / f.source.width,
      (f.cutY + f.cutHeight - 0.5) / f.source.height,
    );
  }
  guarded.add(texture);
}
