import { assetUrl } from './assets';
export const APPEARANCES = ['male', 'female'] as const;
export const OUTFITS = ['sage', 'ember', 'tide'] as const;
export type Appearance = (typeof APPEARANCES)[number];
export type Outfit = (typeof OUTFITS)[number];
export type Atlas = {
  frames: Record<
    string,
    {
      frame: { x: number; y: number; w: number; h: number };
      spriteSourceSize: { x: number; y: number; w: number; h: number };
      sourceSize: { w: number; h: number };
    }
  >;
  meta: { size: { w: number; h: number } };
};
export const appearanceOf = (value: string): Appearance => (value === 'female' ? 'female' : 'male');
export const outfitOf = (value: string): Outfit =>
  value === 'ember' || value === 'tide' ? value : 'sage';
export const characterKey = (appearance: string, outfit: string) =>
  `citizen-${appearanceOf(appearance)}-${outfitOf(outfit)}`;

// Recolor only olive/sage cloth; preserve skin, chestnut hair, cream cuffs and boots.
export function outfitPixel(
  r: number,
  g: number,
  b: number,
  alpha: number,
  outfit: Outfit,
): [number, number, number] {
  if (
    outfit === 'sage' ||
    alpha < 32 ||
    g <= r * 0.9 ||
    g <= b * 1.5 ||
    r <= b * 1.1 ||
    (r + g + b) / 3 < 32
  )
    return [r, g, b];
  const target = outfit === 'ember' ? [181, 111, 75] : [83, 136, 161];
  const light = (r + g + b) / 247;
  return target.map((c) => Math.min(255, Math.round(c * light))) as [number, number, number];
}
export function recolorOutfit(
  source: CanvasImageSource,
  width: number,
  height: number,
  outfit: Outfit,
  clothReference?: CanvasImageSource,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Cannot prepare character artwork');
  ctx.drawImage(source, 0, 0);
  const pixels = ctx.getImageData(0, 0, width, height);
  let cloth: Uint8ClampedArray | undefined;
  if (clothReference) {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(clothReference, 0, 0, width, height);
    cloth = ctx.getImageData(0, 0, width, height).data;
  }
  for (let i = 0; i < pixels.data.length; i += 4) {
    if (pixels.data[i + 3] < 32) continue;
    if (cloth) {
      const maskColor = outfitPixel(cloth[i], cloth[i + 1], cloth[i + 2], cloth[i + 3], outfit);
      // Keep new green weapon details intact: recolor only pixels still matching the original tunic.
      if (
        maskColor.every((value, channel) => value === cloth![i + channel]) ||
        Math.abs(pixels.data[i] - cloth[i]) +
          Math.abs(pixels.data[i + 1] - cloth[i + 1]) +
          Math.abs(pixels.data[i + 2] - cloth[i + 2]) >
          70
      )
        continue;
    }
    const [r, g, b] = outfitPixel(
      pixels.data[i],
      pixels.data[i + 1],
      pixels.data[i + 2],
      pixels.data[i + 3],
      outfit,
    );
    pixels.data[i] = r;
    pixels.data[i + 1] = g;
    pixels.data[i + 2] = b;
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}
const previews = new Map<string, Promise<{ atlas: Atlas; image: string }>>();
export function characterPreview(appearance: string, outfit: string) {
  const a = appearanceOf(appearance),
    o = outfitOf(outfit),
    key = characterKey(a, o);
  let promise = previews.get(key);
  if (!promise) {
    promise = (async () => {
      const response = await fetch(`/assets/characters/citizen-${a}.json`);
      if (!response.ok) throw new Error('Character artwork unavailable');
      const atlas = (await response.json()) as Atlas;
      let image = assetUrl(`/assets/characters/citizen-${a}.png`);
      if (o !== 'sage') {
        const source = new Image();
        source.src = assetUrl(image);
        await source.decode();
        image = recolorOutfit(source, atlas.meta.size.w, atlas.meta.size.h, o).toDataURL(
          'image/png',
        );
      }
      return { atlas, image };
    })();
    previews.set(key, promise);
    promise.catch(() => previews.delete(key));
  }
  return promise;
}
