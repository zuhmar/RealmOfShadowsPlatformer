import { WOODS_QUESTS, QUESTS, itemDefinition, type WoodsQuestId } from '@ros/game-data';
import { questStatus, type Player } from '@ros/shared';
import { ItemIcon } from './ItemIcon';
export function WoodsQuests({
  player: p,
  dialog,
  pending,
  nearMira,
  onAction,
}: {
  player: Player;
  dialog: boolean;
  pending: boolean;
  nearMira: boolean;
  onAction: (id: WoodsQuestId, action: 'accept' | 'claim') => void;
}) {
  return (
    <section className="woods-quests" aria-label="Whispering Woods quest chain">
      <h3>Deeper into Whispering Woods</h3>
      <p>
        15 Wolves → 30 Thorn Spiders → 60 Wild Boars → 3 Forest Bears. Each step requires the
        previous turn-in. Kills count after acceptance.
      </p>
      {Object.values(WOODS_QUESTS).map((q) => {
        const status = questStatus(p, q.id),
          unlocked = !!p.quests?.[q.prerequisite]?.claimed,
          state = p.quests?.[q.id];
        return (
          <article className="quest-card" key={q.id}>
            <h3>{q.title}</h3>
            <p>{q.description}</p>
            <b>
              {!unlocked
                ? 'Locked · complete ' + QUESTS[q.prerequisite].title
                : status === 'claimed'
                  ? 'Completed'
                  : status === 'ready'
                    ? 'Return to Mira'
                    : status === 'active'
                      ? 'In progress'
                      : 'Available from Mira'}
            </b>
            {state && (
              <p>
                {Math.min(state.progress, q.target.count)} / {q.target.count} defeated
              </p>
            )}
            <div className="quest-rewards">
              <b>{q.reward.gold} gold</b>
              {q.reward.items.map((r) => (
                <b key={r.itemId}>
                  <ItemIcon id={r.itemId} />
                  {r.quantity} × {itemDefinition(r.itemId)?.name}
                </b>
              ))}
            </div>
            {dialog && unlocked && (status === 'available' || status === 'ready') && (
              <button
                className="primary"
                disabled={pending || !nearMira}
                onClick={() => onAction(q.id, status === 'available' ? 'accept' : 'claim')}
              >
                {status === 'available' ? `Accept ${q.title}` : `Claim ${q.title}`}
              </button>
            )}
          </article>
        );
      })}
      <p>
        Forest Bear has a 10% chance to drop a Forest Guardian Ring (+4 attack for every class).
        Your first victory grants a trophy, 100 gold, and Crystal Caverns access.
      </p>
      {!!p.firstClearRewards?.includes('forest-bear') && (
        <p>
          <ItemIcon id="forest-bear-trophy" /> First victory complete · Crystal Caverns access
          earned.
        </p>
      )}
    </section>
  );
}
