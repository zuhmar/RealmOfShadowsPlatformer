import type { GameMap } from '@ros/game-data';
import type { Player } from '@ros/shared';
/** Call only on an authoritative map entry, never from client progression fields. */
export function revealOrigin(p: Player, map: Pick<GameMap, 'island'>) {
  if (map.island !== 'Celestial Realm' || p.originRevelation) return false;
  p.originRevelation = {
    title: 'The truth beneath the light',
    text: 'In the Celestial Realm, the spell placed upon you is revealed. You were taken from the Shadow people as a child. An enchantment gave you the white-and-gold appearance of the Celestials and bound you to goodness. You grew up believing you were one of them. When the Shadow Dragon destroyed your hometown, your hidden Shadow nature protected you. You survived because you were Shadow. The years you spent training, and your vow to slay the dragon, now carry a truth you never knew.',
  };
  return true;
}
