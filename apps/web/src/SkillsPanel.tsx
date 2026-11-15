import { useState, type ReactNode } from 'react';
import {
  COMBAT_SKILLS,
  combatSkillXpNeeded,
  GATHERING_SKILLS,
  gatheringXpNeeded,
  CLASS_PATHS,
  CLASS_TALENTS,
  CLASS_CHANGE_GOLD,
  type ClassTalent,
} from '@ros/game-data';
import {
  playerAttributes,
  attackPower,
  playerClassName,
  classPoints,
  type Player,
} from '@ros/shared';
import { HousePopup } from './HousePopup';
import { ClassSprite } from './ClassSprite';
import { JournalArt } from './JournalArt';
import { SkillArt, type SkillIcon } from './SkillArt';
import './skills.css';
const percent = (n: number) => `${(n * 100).toFixed(1)}%`;
const tabs = [
  ['combat', 'Combat', 'melee'],
  ['trades', 'Gathering & crafting', 'mining'],
  ['attributes', 'Attributes', 'shield'],
  ['class', 'Class path', 'critical'],
] as const;
function SkillButton({
  children,
  onClick,
  disabled,
  gold = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  gold?: boolean;
}) {
  return (
    <button className="skills-ribbon" disabled={disabled} onClick={onClick}>
      <JournalArt name={gold ? 'gold-button' : 'purple'} />
      <span>{children}</span>
    </button>
  );
}
export function SkillsPanel({
  player: p,
  onClose,
  onBrowse,
  onRecipes,
  send,
}: {
  player: Player;
  onClose: () => void;
  onBrowse: () => void;
  onRecipes: () => void;
  send: (type: string, payload: unknown) => void;
}) {
  const [tab, setTab] = useState<(typeof tabs)[number][0]>('combat');
  const stats = playerAttributes(p),
    active = stats.activeSkill,
    points = classPoints(p);
  const attributes: [string, string, SkillIcon][] = [
    ['Attack', String(attackPower(p)), 'melee'],
    ['Crit chance', percent(stats.critChance), 'critical'],
    ['Crit damage', percent(stats.critDamage), 'critical'],
    ['Dodge chance', percent(stats.dodgeChance), 'dodge'],
    ['Block chance', percent(stats.blockChance), 'shield'],
    ['Block reduction', percent(stats.blockReduction), 'shield'],
    ['Armor', stats.armor.toFixed(1), 'shield'],
    ['Maximum health', String(stats.maxHealth), 'health'],
    ['Maximum mana', String(stats.maxMana), 'mana'],
    ['Health regen', `${stats.healthRegen.toFixed(2)}/s`, 'health'],
    ['Mana regen', `${stats.manaRegen.toFixed(2)}/s`, 'mana'],
  ];
  return (
    <div className="skills-popup">
      <HousePopup title="Skills & attributes." onClose={onClose}>
        <header className="skills-hero">
          <div className="skills-player">
            <ClassSprite skin={p.skin ?? null} appearance={p.appearance} outfit={p.outfit} />
          </div>
          <div>
            <span className="skills-eyebrow">YOUR GROWING POWER</span>
            <h3>
              {playerClassName(p)} <small>Level {p.level}</small>
            </h3>
            <p>
              {active
                ? `${active} training active · Land hits to grow stronger.`
                : 'Your path begins in Crystal Caverns.'}
            </p>
            <small>Training builds base damage. Equipment supplies attributes.</small>
          </div>
          <SkillArt
            name={active === 'Magic' ? 'magic' : active === 'Distance' ? 'distance' : 'melee'}
          />
        </header>
        <nav className="skills-tabs" aria-label="Skill categories">
          {tabs.map(([id, title, icon]) => (
            <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
              <SkillArt name={icon} />
              <span>{title}</span>
              {id === 'class' && points > 0 && <b className="skills-points">{points}</b>}
            </button>
          ))}
        </nav>
        {tab === 'combat' && (
          <section aria-label="Combat training">
            <div className="skills-section-title">
              <div>
                <span className="skills-eyebrow">TRAIN THROUGH BATTLE</span>
                <h3>Combat training</h3>
              </div>
              <JournalArt name="combat" />
            </div>
            <p className="skills-intro">
              {active
                ? 'Land weapon hits to gain experience. Saved training stays when you switch weapons.'
                : 'Civilians do not train combat skills. Finish the Cavern Mentor’s class trial and choose a class to begin.'}
            </p>
            <div className="skills-combat-grid">
              {Object.entries(COMBAT_SKILLS).map(([name, definition]) => {
                const skill = name as keyof typeof COMBAT_SKILLS,
                  state = p.combatSkills?.[skill] ?? { level: 1, xp: 0 },
                  cap = state.level >= 100;
                return (
                  <article
                    className={`skill-entry combat-entry ${active === name ? 'is-active' : ''}`}
                    key={name}
                  >
                    <SkillArt name={name.toLowerCase() as SkillIcon} />
                    <div>
                      <span className="skills-eyebrow">
                        {active === name ? 'ACTIVE WEAPON SKILL' : 'COMBAT SKILL'}
                      </span>
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
                      </small>
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="skills-note">
              Melee, Magic and Distance increase base damage only. Knight and Rogue train Melee;
              Mage trains Magic; Archer trains Distance.
            </p>
          </section>
        )}
        {tab === 'trades' && (
          <section aria-label="Gathering & crafting">
            <div className="skills-section-title">
              <div>
                <span className="skills-eyebrow">GATHER · CREATE · GROW</span>
                <h3>Gathering & crafting</h3>
              </div>
              <SkillArt name="carpentry" />
            </div>
            <p className="skills-intro">
              Train gathering with your equipped tools. Find recipe scrolls while hunting to
              discover new crafts.
            </p>
            <div className="skills-trades-grid">
              {[...GATHERING_SKILLS, 'Blacksmithing', 'Carpentry', 'Cooking', 'Alchemy'].map(
                (name) => {
                  const state =
                    name === 'Carpentry'
                      ? (p.carpentry ?? { level: 1, xp: 0 })
                      : name === 'Cooking' || name === 'Alchemy'
                        ? (p.craftingSkills?.[name] ?? { level: 1, xp: 0 })
                        : name === 'Blacksmithing'
                          ? (p.blacksmithing ?? { level: 1, xp: 0 })
                          : (p.gatheringSkills?.[name as (typeof GATHERING_SKILLS)[number]] ?? {
                              level: 1,
                              xp: 0,
                            });
                  return (
                    <article className="skill-entry trade-entry" key={name}>
                      <SkillArt name={name.toLowerCase() as SkillIcon} />
                      <div>
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
                      </div>
                    </article>
                  );
                },
              )}
            </div>
            <div className="skills-actions">
              <SkillButton onClick={onRecipes}>Cooking & Alchemy recipes</SkillButton>
              <p>Cooking creates food buffs. Alchemy creates potions.</p>
            </div>
          </section>
        )}
        {tab === 'attributes' && (
          <section aria-label="Combat attributes">
            <div className="skills-section-title">
              <div>
                <span className="skills-eyebrow">YOUR EQUIPPED POWER</span>
                <h3>Combat attributes</h3>
              </div>
              <SkillArt name="shield" />
            </div>
            <p className="skills-intro">
              Identify and equip weapons or armor to gain attributes. Food adds temporary buffs.
            </p>
            <div className="skills-attributes-grid">
              {attributes.map(([name, value, icon]) => (
                <div className="skill-attribute" key={name}>
                  <SkillArt name={icon} />
                  <div>
                    <span>{name}</span>
                    <b>{value}</b>
                  </div>
                </div>
              ))}
            </div>
            <p className="skills-note">
              Crits deal extra damage. Dodge avoids basic attacks; block and armor reduce them. Move
              or jump clear of boss slam warnings.
            </p>
          </section>
        )}
        {tab === 'class' && (
          <section aria-label="Class path">
            <div className="skills-section-title">
              <div>
                <span className="skills-eyebrow">CHOOSE YOUR DESTINY</span>
                <h3>{p.classId ? `${CLASS_PATHS[p.classId].name} path` : 'Choose your class'}</h3>
              </div>
              <SkillArt name="critical" />
            </div>
            <div className="skills-actions">
              <SkillButton
                gold
                onClick={onBrowse}
                disabled={!p.quests?.['crystal-class-trial']?.claimed}
              >
                Browse classes
              </SkillButton>
              <p>
                {p.quests?.['crystal-class-trial']?.claimed
                  ? `First choice is free. Later changes cost ${CLASS_CHANGE_GOLD} gold and refund talent points. Training is retained.`
                  : 'Complete the Cavern Mentor’s class trial in Crystal Caverns to unlock class choice.'}
              </p>
            </div>
            {p.classId && (
              <>
                <h3 className="skills-talent-heading">
                  Class talents <span>{points} points available</span>
                </h3>
                <p className="skills-intro">
                  Earn one point every five character levels, up to 15.
                </p>
                <div className="skills-combat-grid">
                  {Object.entries(CLASS_TALENTS).map(([id, talent], i) => {
                    const rank = p.classTalents?.[id as ClassTalent] ?? 0;
                    return (
                      <article className="skill-entry talent-entry" key={id}>
                        <SkillArt
                          name={
                            i === 2
                              ? 'critical'
                              : active === 'Magic'
                                ? 'magic'
                                : active === 'Distance'
                                  ? 'distance'
                                  : 'melee'
                          }
                        />
                        <div>
                          <h4>
                            {id === 'signature' ? CLASS_PATHS[p.classId!].signature : talent.name}
                          </h4>
                          <span className="skills-eyebrow">
                            RANK {rank} / {talent.max}
                          </span>
                          <p>{talent.description}</p>
                          <SkillButton
                            disabled={!points || rank >= talent.max}
                            onClick={() => send('class', { action: 'talent', id })}
                          >
                            Learn rank
                          </SkillButton>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}
      </HousePopup>
    </div>
  );
}
