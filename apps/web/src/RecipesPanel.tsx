import { knowsRecipe } from '@ros/shared';
import { recipeSource, recipeScroll } from '@ros/game-data';
import { useState, useEffect } from 'react';
import {
  POTION_COOLDOWN,
  PROVISION_RECIPES,
  PROVISION_STATIONS,
  itemDefinition,
  gatheringXpNeeded,
  type ProvisionSkill,
} from '@ros/game-data';
import { nearNpc, foodEffect, type Player } from '@ros/shared';
import { ItemIcon } from './ItemIcon';
import { MAPS } from '@ros/game-data';
export function RecipesPanel({
  player: p,
  initialSkill = 'Cooking',
  pending,
  onAction,
}: {
  player: Player;
  initialSkill?: ProvisionSkill;
  pending: boolean;
  onAction: (action: 'craft' | 'use', id: string) => void;
}) {
  const [skill, setSkill] = useState<ProvisionSkill>(initialSkill),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const state = p.craftingSkills?.[skill] ?? { level: 1, xp: 0 },
    station = PROVISION_STATIONS.find((s) => s.skill === skill)!;
  const near = p.mapId === 'village' && nearNpc(p, MAPS.village, station.id),
    food = foodEffect(p, now),
    cooldown = Math.min(
      POTION_COOLDOWN / 1000,
      Math.max(0, Math.ceil(((p.potionReadyAt ?? 0) - now) / 1000)),
    );
  return (
    <section className="recipes-panel">
      <div className="recipe-tabs" role="group" aria-label="Recipe profession">
        {(['Cooking', 'Alchemy'] as const).map((s) => (
          <button
            key={s}
            className={s === skill ? 'primary' : 'secondary'}
            aria-pressed={s === skill}
            onClick={() => setSkill(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <h3>
        {skill} · Lv. {state.level} ·{' '}
        {PROVISION_RECIPES.filter((r) => r.skill === skill && knowsRecipe(p, r.id)).length}/
        {PROVISION_RECIPES.filter((r) => r.skill === skill).length} recipes learned
      </h3>
      <progress
        aria-label={`${skill} progress`}
        max={gatheringXpNeeded(state.level)}
        value={state.xp}
      />
      <p>
        {state.level >= 100 ? 'Mastered' : `${state.xp} / ${gatheringXpNeeded(state.level)} XP`}
      </p>
      <p>
        {skill === 'Cooking'
          ? 'Meals grant temporary buffs. Eating another meal replaces the active food buff; effects do not stack. Buff time continues while offline; offline rewards do not include food bonuses.'
          : 'Potions restore health or mana and share a 10-second cooldown. Full health or mana will not waste a potion.'}
      </p>
      <p>Hunt monsters and collect their recipe scrolls to learn these recipes permanently.</p>
      <p>
        {near
          ? `${station.name} ready.`
          : `Craft at the ${station.name} in Elderwood Village. You can use owned items anywhere.`}
      </p>
      {food && (
        <p role="status">
          Active food: {food.name} · {Math.max(0, Math.ceil((p.foodBuff!.expiresAt - now) / 1000))}s
          remaining
        </p>
      )}
      {cooldown > 0 && <p role="status">Potion cooldown: {cooldown}s</p>}
      <div className="forge-recipes">
        {PROVISION_RECIPES.filter((r) => r.skill === skill).map((r) => {
          const discovered = knowsRecipe(p, r.id);
          const locked = state.level < r.level || p.level < r.characterLevel,
            enough = Object.entries(r.cost).every(([id, n]) => (p.inventory[id] ?? 0) >= n),
            owned = p.inventory[r.id] ?? 0;
          return (
            <section key={r.id}>
              <ItemIcon id={discovered ? r.id : recipeScroll(r.id)} />
              <div>
                <b>{r.name}</b>
                <p>
                  {discovered ? 'Recipe learned' : `Undiscovered · Find on ${recipeSource(r.id)}`}
                </p>
                <p>{r.description}</p>
                <p>
                  {skill} Lv. {r.level} · Character Lv. {r.characterLevel} · +{r.xp} XP
                </p>
                <p>
                  {Object.entries(r.cost)
                    .map(
                      ([id, n]) => `${itemDefinition(id)?.name ?? id} ${p.inventory[id] ?? 0}/${n}`,
                    )
                    .join(' · ')}
                </p>
                <small>Owned: {owned}</small>
              </div>
              <div className="recipe-actions">
                <button
                  className="primary"
                  disabled={pending || !near || locked || !enough || !discovered}
                  onClick={() => onAction('craft', r.id)}
                  aria-label={`Craft ${r.name}`}
                >
                  {!discovered ? 'Find recipe' : locked ? 'Level locked' : 'Craft'}
                </button>
                <button
                  className="secondary"
                  disabled={
                    pending ||
                    !owned ||
                    p.level < r.characterLevel ||
                    (r.skill === 'Alchemy' && cooldown > 0)
                  }
                  onClick={() => onAction('use', r.id)}
                  aria-label={`Use ${r.name}`}
                >
                  {r.skill === 'Cooking' ? 'Eat' : 'Drink'}
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
