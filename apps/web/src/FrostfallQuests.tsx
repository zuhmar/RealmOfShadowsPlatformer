import { FROSTFALL_QUESTS, QUESTS } from '@ros/game-data';
import { questStatus, type Player } from '@ros/shared';
export function FrostfallQuests({
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
      <h3>Frostfall Tundra · Beyond the snow</h3>
      <p>
        Meet the Frost Warden above the fishing dock in Snowfang Pass. Complete the Hydra quest
        first. Only kills after acceptance count.
      </p>
      {Object.values(FROSTFALL_QUESTS).map((q) => {
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
                    ? 'Return to the Frost Warden'
                    : status === 'active'
                      ? 'In progress'
                      : 'Available from the Frost Warden'}
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
