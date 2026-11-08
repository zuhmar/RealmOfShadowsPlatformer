import {
  COMBAT_SKILLS,
  combatSkillXpNeeded,
  GATHERING_SKILLS,
  gatheringXpNeeded,
  weaponProfile,
  type CombatSkill,
} from '@ros/game-data';
import { playerAttributes, attackPower, playerClassName, type Player } from '@ros/shared';
const percent = (n: number) => `${(n * 100).toFixed(1)}%`;
export function SkillsPanel({ player: p }: { player: Player }) {
  const stats = playerAttributes(p),
    active = stats.activeSkill;
  const attributes = [
    ['Attack', String(attackPower(p))],
    ['Crit chance', percent(stats.critChance)],
    ['Crit damage', percent(stats.critDamage)],
    ['Dodge chance', percent(stats.dodgeChance)],
    ['Block chance', percent(stats.blockChance)],
    ['Block reduction', percent(stats.blockReduction)],
    ['Armor', stats.armor.toFixed(1)],
    ['Maximum health', String(stats.maxHealth)],
    ['Maximum mana', String(stats.maxMana)],
    ['Health regen', `${stats.healthRegen.toFixed(2)}/s`],
    ['Mana regen', `${stats.manaRegen.toFixed(2)}/s`],
  ];
  return (
    <section className="skills-panel">
      <h3>
        {playerClassName(p)}
        {active ? ` · ${active} training` : ' · No class combat skill'}
      </h3>
      <p>
        {active
          ? 'Land hits to train your weapon skill and increase base damage.'
          : 'Civilians do not train combat skills. Complete the Crystal Caverns class quest, choose a class, and equip its weapon to begin.'}{' '}
        Saved training stays when you switch weapons.
      </p>
      <div className="stat-grid" aria-label="Combat attributes">
        {attributes.map(([name, value]) => (
          <div key={name}>
            <span>{name}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>
      <p>
        Identify and equip weapons or armor to gain permanent attributes. Cooking adds temporary
        buffs. Training only increases base damage. Crits deal extra damage. Dodge avoids basic
        attacks; block and armor reduce them. Boss red-zone slams must still be avoided by moving or
        jumping clear.
      </p>
      <h3>Combat training</h3>
      <div className="skills-grid">
        {Object.entries(COMBAT_SKILLS).map(([name, definition]) => {
          const skill = name as CombatSkill,
            state = p.combatSkills?.[skill] ?? { level: 1, xp: 0 },
            cap = state.level >= 100;
          return (
            <article className={`training-card ${active === skill ? 'active' : ''}`} key={name}>
              <h4>
                {name} <small>Lv. {state.level}</small>
              </h4>
              <p>{definition.description}</p>
              <progress
                aria-label={`${name} skill progress`}
                value={cap ? 1 : state.xp}
                max={cap ? 1 : combatSkillXpNeeded(state.level)}
              />
              <small>
                {cap ? 'Mastered' : `${state.xp} / ${combatSkillXpNeeded(state.level)} XP`}
                {active === skill
                  ? ' · Active weapon skill'
                  : !active
                    ? ' · Combat training inactive'
                    : ''}
              </small>
            </article>
          );
        })}
      </div>
      <h3>Gathering & crafting</h3>
      <div className="skills-grid">
        {[...GATHERING_SKILLS, 'Blacksmithing', 'Cooking', 'Alchemy'].map((name) => {
          const state =
            name === 'Cooking' || name === 'Alchemy'
              ? (p.craftingSkills?.[name] ?? { level: 1, xp: 0 })
              : name === 'Blacksmithing'
                ? (p.blacksmithing ?? { level: 1, xp: 0 })
                : (p.gatheringSkills?.[name as (typeof GATHERING_SKILLS)[number]] ?? {
                    level: 1,
                    xp: 0,
                  });
          return (
            <article className="training-card" key={name}>
              <h4>
                {name} <small>Lv. {state.level}</small>
              </h4>
              <progress
                aria-label={`${name} skill progress`}
                value={state.xp}
                max={gatheringXpNeeded(state.level)}
              />
              <small>
                {state.xp} / {gatheringXpNeeded(state.level)} XP
              </small>
            </article>
          );
        })}
      </div>
    </section>
  );
}
