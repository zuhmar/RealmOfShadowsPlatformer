import { BRAM_QUEST, FORGE_RECIPES, itemDefinition } from '@ros/game-data';
import type { Player } from '@ros/shared';
import { ItemIcon } from './ItemIcon';
import { ToolIcon } from './ToolIcon';
export function ForgePanel({
  player: p,
  near,
  pending,
  onAction,
  onTalk,
}: {
  player: Player;
  near: boolean;
  pending: boolean;
  onAction: (action: 'accept' | 'craft' | 'claim', recipeId?: string) => void;
  onTalk: () => void;
}) {
  const q = p.forgeQuest,
    ready = !!q && !q.claimed && q.barsSmelted >= 5 && q.toolsCrafted >= 1;
  return (
    <article className="forge-panel">
      <span className="eyebrow">BRAM · BLACKSMITHING</span>
      <h3>{BRAM_QUEST.title}</h3>
      <p>{BRAM_QUEST.offer}</p>
      {!near && (
        <button className="secondary" onClick={onTalk}>
          Talk to Bram at his forge
        </button>
      )}
      {!q?.accepted ? (
        <button className="primary" disabled={!near || pending} onClick={() => onAction('accept')}>
          Accept Bram’s quest
        </button>
      ) : (
        <>
          <p>
            Iron Bars smelted: {Math.min(5, q.barsSmelted)}/5 · Iron tools forged:{' '}
            {Math.min(1, q.toolsCrafted)}/1
          </p>
          <p>
            {q.claimed
              ? 'Quest complete. Keep forging tools here.'
              : 'Reward: 25 gold + 20 Blacksmithing XP'}
          </p>
          {ready && (
            <button
              className="primary"
              disabled={!near || pending}
              onClick={() => onAction('claim')}
            >
              Claim Bram’s reward
            </button>
          )}
          <h3>Forge recipes</h3>
          <p>
            Blacksmithing Lv. {p.blacksmithing?.level ?? 1} · {p.blacksmithing?.xp ?? 0} XP · Iron
            tools gather in 20% less time.
          </p>
          <div className="forge-recipes">
            {FORGE_RECIPES.map((recipe) => {
              const owned = recipe.kind === 'tool' && p.ownedTools?.includes(recipe.id),
                enough = Object.entries(recipe.cost).every(
                  ([id, qty]) => (p.inventory[id] ?? 0) >= qty,
                );
              return (
                <section key={recipe.id}>
                  {recipe.kind === 'tool' ? (
                    <ToolIcon id={recipe.id} />
                  ) : (
                    <ItemIcon id={recipe.id} />
                  )}
                  <div>
                    <b>{recipe.name}</b>
                    <p>
                      {Object.entries(recipe.cost)
                        .map(
                          ([id, qty]) =>
                            `${itemDefinition(id)?.name ?? id} ${p.inventory[id] ?? 0}/${qty}`,
                        )
                        .join(' · ')}
                    </p>
                  </div>
                  <button
                    className="secondary"
                    disabled={!near || pending || !enough || !!owned}
                    onClick={() => onAction('craft', recipe.id)}
                  >
                    {owned ? 'Owned' : recipe.kind === 'material' ? 'Smelt' : 'Forge'}
                  </button>
                </section>
              );
            })}
          </div>
        </>
      )}
    </article>
  );
}
