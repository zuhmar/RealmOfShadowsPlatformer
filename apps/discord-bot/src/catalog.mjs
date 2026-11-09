import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';
const root = fileURLToPath(new URL('../../../docs/community/discord/', import.meta.url));
export async function loadCatalog() {
  const { cards } = JSON.parse(await readFile(resolve(root, 'showcase-manifest.json'), 'utf8'));
  return cards;
}
export function selectCard(cards, id) {
  const card = cards.find((c) => c.id === id);
  if (!card || !/^[a-z0-9-]+$/.test(id))
    throw new Error('Unknown showcase ID. Use /catalog to see available cards.');
  const path = resolve(root, card.file);
  if (
    !path.startsWith(root.replace(/\/$/, '') + sep) ||
    !/^(features|items|classes|monsters)\/[a-z0-9-]+\.png$/.test(card.file)
  )
    throw new Error('Invalid showcase file');
  return { card, path };
}
