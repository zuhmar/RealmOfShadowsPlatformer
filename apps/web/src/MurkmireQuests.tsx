import { MURKMIRE_QUESTS, QUESTS } from '@ros/game-data';
import { questStatus, type Player } from '@ros/shared';
export function MurkmireQuests({
  player: p,
  dialog,
  near,
  pending,
  send,
}: {
  player: Player;
  dialog: boolean;
  near: boolean;
  pending: boolean;
  send: (type: string, payload: unknown) => void;
}) {
  return (
    <section className="crystal-quests">
      <h3>Murkmire Swamp · Into the mire</h3>
      <p>
        Meet the Mire Warden above the fishing dock in Bog Slime Pools. Complete the Crystal Wyrm
        quest first. Only kills after acceptance count.
      </p>
      {Object.values(MURKMIRE_QUESTS).map((q) => {
        const status = questStatus(p, q.id),
          unlocked = !!p.quests?.[q.prerequisite]?.claimed;
        return (
          <article className="quest-card" key={q.id}>
            <h4>{q.title}</h4>
            <p>{q.description}</p>
            <b>
              {!unlocked
                ? `Complete ${QUESTS[q.prerequisite].title}`
                : status === 'claimed'
                  ? 'Completed'
                  : status === 'ready'
                    ? 'Return to the Mire Warden'
                    : status === 'active'
                      ? 'In progress'
                      : 'Available from the Mire Warden'}
            </b>
            <p>
              {p.quests?.[q.id]?.progress ?? 0}/{q.target.count} defeated · {q.reward.gold} gold
            </p>
            {dialog && unlocked && ['available', 'ready'].includes(status) && (
              <button
                className="primary"
                disabled={!near || pending}
                onClick={() =>
                  send('quest', {
                    questId: q.id,
                    action: status === 'available' ? 'accept' : 'claim',
                  })
                }
              >
                {status === 'available' ? 'Accept quest' : 'Claim reward'}
              </button>
            )}
          </article>
        );
      })}
    </section>
  );
}
