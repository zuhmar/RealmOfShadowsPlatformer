import Phaser from 'phaser';

/** Repeat at a uniform scale and crop the final piece; never stretch to a collider. */
export function artworkStrip(
  scene: Phaser.Scene,
  options: {
    texture: string;
    frame: string;
    x: number;
    y: number;
    length: number;
    thickness: number;
    vertical?: boolean;
    surface?: number;
    depth?: number;
    name?: string;
  },
) {
  const o = options,
    f = scene.textures.getFrame(o.texture, o.frame);
  const scale = o.thickness / (o.vertical ? f.width : f.height);
  const step = (o.vertical ? f.height : f.width) * scale;
  const pieces: Phaser.GameObjects.Image[] = [];
  for (let offset = 0; offset < o.length - 0.001; offset += step) {
    const remaining = Math.min(step, o.length - offset);
    const image = scene.add
      .image(
        o.x + (o.vertical ? -o.thickness / 2 : offset),
        o.y + (o.vertical ? offset : -(o.surface ?? 0) * scale),
        o.texture,
        o.frame,
      )
      .setOrigin(0)
      .setScale(scale)
      .setDepth(o.depth ?? 0)
      .setName(o.name ?? 'artwork-tile')
      .setData({ stripLength: o.length, cropLength: remaining, uniformScale: scale });
    if (remaining < step)
      image.setCrop(
        0,
        0,
        o.vertical ? f.width : remaining / scale,
        o.vertical ? remaining / scale : f.height,
      );
    pieces.push(image);
  }
  return pieces;
}

export function fitArtwork<T extends Phaser.GameObjects.Image | Phaser.GameObjects.Sprite>(
  image: T,
  width: number,
  height: number,
): T {
  image.setScale(Math.min(width / image.width, height / image.height));
  return image;
}
