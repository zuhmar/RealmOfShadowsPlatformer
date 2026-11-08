import {
  provisionRecipe,
  POTION_COOLDOWN,
  gatheringXpNeeded,
  type ProvisionRecipe,
} from '@ros/game-data';
import type { Player } from './index';
import { playerAttributes } from './combat-skills';
export function foodEffect(
  p: Pick<Player, 'foodBuff'>,
  now = Date.now(),
): ProvisionRecipe | undefined {
  if (!p.foodBuff || p.foodBuff.expiresAt <= now) return;
  const recipe = provisionRecipe(p.foodBuff.recipeId);
  return recipe?.skill === 'Cooking' ? recipe : undefined;
}
export function expireFood(p: Player, now: number) {
  if (p.foodBuff && p.foodBuff.expiresAt <= now) delete p.foodBuff;
}
export function provisionAction(p: Player, action: 'craft' | 'use', id: string, now = Date.now()) {
  const r = provisionRecipe(id);
  if (!r) throw new Error('Unknown recipe.');
  if (p.level < r.characterLevel) throw new Error(`Requires character level ${r.characterLevel}.`);
  if (action === 'craft') {
    const state = p.craftingSkills?.[r.skill] ?? { level: 1, xp: 0 };
    if (state.level < r.level) throw new Error(`Requires ${r.skill} level ${r.level}.`);
    for (const [item, n] of Object.entries(r.cost))
      if ((p.inventory[item] ?? 0) < n) throw new Error('Not enough ingredients.');
    for (const [item, n] of Object.entries(r.cost)) {
      p.inventory[item] -= n;
      if (!p.inventory[item]) delete p.inventory[item];
    }
    p.inventory[r.id] = (p.inventory[r.id] ?? 0) + 1;
    const skill = ((p.craftingSkills ??= {})[r.skill] ??= { level: 1, xp: 0 });
    skill.xp += r.xp;
    while (skill.level < 100 && skill.xp >= gatheringXpNeeded(skill.level)) {
      skill.xp -= gatheringXpNeeded(skill.level);
      skill.level++;
    }
    if (skill.level >= 100) skill.xp = 0;
    return `${r.name} crafted. +${r.xp} ${r.skill} XP.`;
  }
  if (action !== 'use') throw new Error('Unknown recipe action.');
  if (!((p.inventory[r.id] ?? 0) >= 1)) throw new Error('You do not have this item.');
  if (r.skill === 'Alchemy') {
    if ((p.potionReadyAt ?? 0) > now) throw new Error('Potions share a 10-second cooldown.');
    const stats = playerAttributes(p);
    if (r.effect === 'health' && p.hp >= stats.maxHealth)
      throw new Error('Health is already full.');
    if (r.effect === 'mana' && p.mp >= stats.maxMana) throw new Error('Mana is already full.');
    if (r.effect === 'health') p.hp = Math.min(stats.maxHealth, p.hp + r.amount);
    if (r.effect === 'mana') p.mp = Math.min(stats.maxMana, p.mp + r.amount);
    p.potionReadyAt = now + POTION_COOLDOWN;
  } else p.foodBuff = { recipeId: r.id, expiresAt: now + r.duration! };
  p.inventory[r.id]--;
  if (!p.inventory[r.id]) delete p.inventory[r.id];
  return `${r.name} used.`;
}
