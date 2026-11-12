import type Phaser from 'phaser';
type Contact = { x: number; y: number };
const contacts = new WeakMap<Phaser.Textures.Frame, Contact>();
const surfaces = new WeakMap<Phaser.Textures.Frame, Map<number, number>>();
function pixels(frame: Phaser.Textures.Frame, x = 0, width = frame.cutWidth) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = frame.cutHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(
    frame.source.image as HTMLImageElement,
    frame.cutX + x,
    frame.cutY,
    width,
    frame.cutHeight,
    0,
    0,
    width,
    frame.cutHeight,
  );
  return ctx.getImageData(0, 0, width, frame.cutHeight).data;
}
/** Measure the visible feet, excluding transparent margins and ambient glows. Cached per authored frame. */
function contact(frame: Phaser.Textures.Frame): Contact {
  const cached = contacts.get(frame);
  if (cached) return cached;
  const rgba = pixels(frame),
    w = frame.cutWidth,
    h = frame.cutHeight,
    threshold = Math.max(3, Math.ceil(w * 0.03));
  let row = h - 1,
    xs: number[] = [];
  for (; row >= 0; row--) {
    xs = [];
    for (let x = 0; x < w; x++) if (rgba[(row * w + x) * 4 + 3] >= 180) xs.push(x);
    if (xs.length >= threshold) break;
  }
  const trim = (frame.customData as { spriteSourceSize?: { x: number; y: number } })
    ?.spriteSourceSize ?? { x: 0, y: 0 };
  const value =
    row < 0
      ? { x: frame.realWidth * 0.5, y: frame.realHeight }
      : { x: trim.x + xs.reduce((sum, x) => sum + x, 0) / xs.length + 0.5, y: trim.y + row + 1 };
  contacts.set(frame, value);
  return value;
}
/** Sample the actual grass/wood silhouette at the prop's contact point, rather than the collider's flat line. */
function surfaceAt(platform: Phaser.GameObjects.Image, worldX: number) {
  const f = platform.frame,
    left = platform.getTopLeft();
  const x = Math.max(0, Math.min(f.cutWidth - 3, Math.round((worldX - left.x) / platform.scaleX)));
  let columns = surfaces.get(f);
  if (!columns) {
    columns = new Map();
    surfaces.set(f, columns);
  }
  let row = columns.get(x);
  if (row === undefined) {
    const rgba = pixels(f, x, 3);
    row = 0;
    for (; row < f.cutHeight; row++)
      if ([0, 1, 2].filter((dx) => rgba[(row! * 3 + dx) * 4 + 3] >= 180).length >= 2) break;
    if (row >= f.cutHeight) row = Math.round(platform.originY * f.realHeight);
    columns.set(x, row);
  }
  return left.y + row * platform.scaleY;
}
export function groundProp(
  scene: Phaser.Scene,
  image: Phaser.GameObjects.Image,
  x: number,
  y: number,
  platformId?: string,
) {
  const candidates = scene.children.list
    .filter((o) => o.name === 'terrain-platform')
    .map((o) => o as Phaser.GameObjects.Image)
    .filter(
      (p) =>
        p.getData('generated') &&
        (!platformId || p.getData('platformId') === platformId) &&
        x >= p.x &&
        x <= p.x + p.getData('terrainWidth') &&
        Math.abs(p.getData('surfaceY') - y) < 50,
    )
    .sort((a, b) => Math.abs(a.getData('surfaceY') - y) - Math.abs(b.getData('surfaceY') - y));
  const platform = candidates[0];
  if (!platform) return image;
  const foot = contact(image.frame),
    surface = surfaceAt(platform, x),
    inset = platform.getData('material') === 'terrain' ? 6 : 1;
  image
    .setOrigin(foot.x / image.frame.realWidth, foot.y / image.frame.realHeight)
    .setPosition(x, surface + inset);
  return image.setData({
    groundedProp: true,
    groundSurfaceY: surface,
    groundContactX: foot.x,
    groundContactY: foot.y,
    groundInset: inset,
    groundPlatformId: platform.getData('platformId'),
  });
}
