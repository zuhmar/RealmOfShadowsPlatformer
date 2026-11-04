import { createCraftedGear } from './equipment';
import { BRAM_QUEST, FORGE_RECIPES, gatheringXpNeeded } from '@ros/game-data';
import type { Player } from './index';
export function forgeAction(p: Player, action: 'accept' | 'craft' | 'claim', recipeId?: string) {
  if (action === 'accept') {
    if (p.forgeQuest?.accepted) throw new Error('You already accepted Bram’s quest.');
    p.forgeQuest = { accepted: true, claimed: false, barsSmelted: 0, toolsCrafted: 0 };
    return 'Bram’s quest accepted. Gather 100 Iron Ore and 20 Oak Logs.';
  }
  const quest = p.forgeQuest;
  if (!quest?.accepted) throw new Error('Accept Bram’s quest first.');
  const xp = (amount: number) => {
    p.blacksmithing ??= { level: 1, xp: 0 };
    p.blacksmithing.xp += amount;
    while (p.blacksmithing.xp >= gatheringXpNeeded(p.blacksmithing.level)) {
      p.blacksmithing.xp -= gatheringXpNeeded(p.blacksmithing.level);
      p.blacksmithing.level++;
    }
  };
  if (action === 'claim') {
    if (quest.claimed) throw new Error('You already claimed Bram’s reward.');
    if (quest.barsSmelted < 5 || quest.toolsCrafted < 1)
      throw new Error('Smelt 5 Iron Bars and craft an Iron tool first.');
    quest.claimed = true;
    p.gold += BRAM_QUEST.rewardGold;
    xp(BRAM_QUEST.rewardXp);
    return 'Bram’s quest complete: +25 gold and +20 Blacksmithing XP.';
  }
  const recipe = FORGE_RECIPES.find((r) => r.id === recipeId);
  if (!recipe) throw new Error('Unknown forge recipe.');
  if (p.level < (recipe.level ?? 1) || (p.blacksmithing?.level ?? 1) < (recipe.level ?? 1))
    throw new Error(`Requires character and Blacksmithing level ${recipe.level}.`);
  if (recipe.kind === 'tool' && p.ownedTools?.includes(recipe.id))
    throw new Error('You already own this tool.');
  for (const [id, qty] of Object.entries(recipe.cost))
    if ((p.inventory[id] ?? 0) < qty) throw new Error('Not enough materials.');
  for (const [id, qty] of Object.entries(recipe.cost)) {
    p.inventory[id] -= qty;
    if (p.inventory[id] === 0) delete p.inventory[id];
  }
  if (recipe.kind === 'material') {
    p.inventory[recipe.id] = (p.inventory[recipe.id] ?? 0) + 1;
    if (recipe.id === 'iron-bar') quest.barsSmelted++;
  } else if (recipe.kind === 'equipment') {
    (p.gear ??= []).push(createCraftedGear(recipe.id));
  } else {
    p.ownedTools ??= [];
    p.ownedTools.push(recipe.id);
    if (recipe.id.startsWith('iron-')) quest.toolsCrafted++;
  }
  xp(recipe.xp);
  return `${recipe.name} ${recipe.kind === 'material' ? 'smelted' : recipe.kind === 'equipment' ? 'forged — equip it in Bag' : 'forged — equip it in Character'}! +${recipe.xp} Blacksmithing XP.`;
}
