import {
  MAPS,
  WOODS_MONSTERS,
  QUESTS,
  maxHp,
  weaponProfile,
  FORGE_RECIPES,
  type ClassId,
} from '@ros/game-data';
import {
  World,
  createPlayer,
  createCraftedGear,
  equipGear,
  playerAttributes,
  weaponTrainingSkill,
  grantXp,
  classSkillCooldown,
} from '@ros/shared';
export function encounter(
  weapon: string,
  monster: keyof typeof WOODS_MONSTERS,
  level: number,
  skill: number,
  armor = false,
  hpOverride?: number,
  selectedClass = false,
) {
  const map = Object.values(MAPS).find((m) => m.monster === monster) ?? MAPS.woods;
  const w = new World(map),
    p = createPlayer('balance', 'Balance', map.id),
    target = w.wolves[0];
  p.weapon = weapon;
  if (selectedClass) {
    p.classId = weaponProfile(weapon).className.toLowerCase() as ClassId;
    p.classTalents = { mastery: 1, signature: 2, discipline: 1 };
  }
  p.level = level;
  p.x = target.x - 45;
  p.y = target.y;
  p.facing = 1;
  p.mp = 50;
  p.combatSkills = { [weaponTrainingSkill(weapon)!]: { level: skill, xp: 0 } };
  if (armor) {
    p.gear = [
      createCraftedGear(weapon),
      ...['helmet', 'armor', 'legs', 'boots'].map((part) =>
        createCraftedGear(`${weapon.startsWith('crystal-') ? 'crystal' : 'woods'}-${part}`),
      ),
    ];
    for (const g of p.gear) equipGear(p, g.id);
  }
  w.players.set(p.id, p);
  w.wolves = [target];
  if (hpOverride) target.hp = hpOverride;
  let time = 0;
  const originalRandom = Math.random;
  Math.random = () => 0.99;
  try {
    // Stationary damage benchmark: no travel, respawn wait, AI or incoming damage. Actual server attacks/projectiles/flurry/training.
    while (target.hp > 0 && time < 120000) {
      const now = 10000 + time;
      p.mp = Math.min(playerAttributes(p).maxMana, p.mp + 0.03);
      const special = now - p.lastSkill >= classSkillCooldown(p) && p.mp >= 12;
      w.attack(p, special, now);
      w.stepProjectiles(0.02, now);
      w.stepFlurry(now);
      time += 20;
    }
  } finally {
    Math.random = originalRandom;
  }
  return {
    weapon,
    monster,
    level,
    skill,
    classSelected: selectedClass,
    attackInterval: weaponProfile(weapon).cooldown,
    seconds: +(time / 1000).toFixed(2),
  };
}
const weapons = ['woods-sword', 'woods-bow', 'woods-staff', 'woods-dagger'];
const before = weapons.map((weapon) => encounter(weapon, 'forest-bear', 7, 6, true, 450));
const after = weapons.map((weapon) => encounter(weapon, 'forest-bear', 7, 6, true));
console.log(
  JSON.stringify(
    {
      assumptions:
        'Stationary server damage benchmark; excludes navigation, dodging and respawn waits. 20ms steps. Woods characters are Civilian (saved training inactive); Crystal characters have chosen a class with four earned talent points. Crafted weapon and four armor pieces, no random attributes. Skill XP accrues on real hits.',
      bossBefore450: before,
      bossCurrent: after,
      crystalWyrm: ['sword', 'bow', 'staff', 'dagger'].map((kind) =>
        encounter(`crystal-${kind}`, 'crystal-wyrm', 20, 10, true, undefined, true),
      ),
      normals: [
        encounter('elderwood-blade', 'wolf', 1, 1),
        encounter('woods-sword', 'thorn-spider', 4, 3),
        encounter('woods-sword', 'wild-boar', 6, 5),
      ],
    },
    null,
    2,
  ),
);
const p = createPlayer('pace', 'Pace');
const stages = [
  ['mira-wolves', 'wolf'],
  ['mira-spiders', 'thorn-spider'],
  ['mira-boars', 'wild-boar'],
  ['mira-bear', 'forest-bear'],
] as const;
const pace = stages.map(([id, monster]) => {
  const q = QUESTS[id];
  for (let n = 0; n < q.target.count; n++) grantXp(p, WOODS_MONSTERS[monster].xp);
  return {
    quest: id,
    kills: q.target.count,
    levelAfter: p.level,
    xp: p.xp,
    goldFromKills: q.target.count * WOODS_MONSTERS[monster].gold,
    rewardGold: q.reward.gold,
  };
});
const totalGold = pace.reduce((n, s) => n + s.goldFromKills + s.rewardGold, 0) + 100;
console.log(
  JSON.stringify(
    {
      questPacing: pace,
      economy: {
        totalGoldThroughFirstClear: totalGold,
        expectedGearFrom105NormalsAndBoss: 11.5,
        expectedIdentificationCost: 11.5 * 75,
        armorOre: 4 * 5 * 20,
        full8PieceOre: 8 * 5 * 20,
        expectedGatherMinutesFullSetWood: (((8 * 5 * 20) / 2) * 3) / 60,
        expectedGatherMinutesFullSetIron: (((8 * 5 * 20) / 2) * 3 * 0.8) / 60,
        barRecipe: FORGE_RECIPES[0].cost,
      },
      bossHit: {
        basic: WOODS_MONSTERS['forest-bear'].damage,
        slam: 88,
        level7Health: maxHp(7) + 20,
      },
    },
    null,
    2,
  ),
);
