import manifest from '../public/assets/optimized-manifest.json';
const optimized = manifest as Record<string, string>;
/** Preserve authored atlas coordinates while serving compact delivery copies. */
export function assetUrl(path: string): string {
  return optimized[path] ?? path;
}
