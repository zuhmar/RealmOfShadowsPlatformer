import { CRYSTAL_QUESTS, QUESTS } from '@ros/game-data';
import { questStatus, type Player } from '@ros/shared';
import { ClassPanel } from './ClassPanel';
export function CrystalQuests({
  player: p,
  dialog,
  near,
  pending,
  send,
  onBrowse,
}: {
  player: Player;
  dialog: boolean;
  near: boolean;
  pending: boolean;
  send: (type: string, payload: unknown) => void;
  onBrowse: () => void;
}) {
  return (
    <section className="crystal-quests">
      <h3>Crystal Caverns · Find your path</h3>
      <p>
        Meet the Cavern Mentor on the upper-left ledge of Cave Bat Roost. Complete the first quest
        to unlock class choice. Only kills after acceptance count.
      </p>
      {Object.values(CRYSTAL_QUESTS).map((q) => {
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
                    ? 'Return to the Cavern Mentor'
                    : status === 'active'
                      ? 'In progress'
                      : 'Available from the Cavern Mentor'}
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
      {dialog && p.quests?.['crystal-class-trial']?.claimed && (
        <ClassPanel player={p} send={send} onBrowse={onBrowse} />
      )}
    </section>
  );
}
