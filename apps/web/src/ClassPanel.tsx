import { CLASS_PATHS, CLASS_CHANGE_GOLD, CLASS_TALENTS, type ClassTalent } from '@ros/game-data';
import { classPoints, type Player } from '@ros/shared';
export function ClassPanel({
  player: p,
  send,
  onBrowse,
}: {
  player: Player;
  send: (type: string, payload: unknown) => void;
  onBrowse: () => void;
}) {
  return (
    <section className="class-paths">
      <h3>{p.classId ? `${CLASS_PATHS[p.classId].name} path` : 'Choose your class'}</h3>
      <p>
        Stay Civilian while trying all four weapons in Whispering Woods. Complete the Cavern
        Mentor’s class trial in Crystal Caverns to unlock your path. First choice is free; later
        changes cost {CLASS_CHANGE_GOLD} gold and refund talent points. Combat training is retained.
      </p>
      <button onClick={onBrowse} disabled={!p.quests?.['crystal-class-trial']?.claimed}>
        Browse classes
      </button>
      {p.classId && (
        <>
          <h3>Class talents · {classPoints(p)} points available</h3>
          <p>
            Earn one point every five character levels, up to 15. Talents change damage and special
            techniques; equipment supplies your attributes.
          </p>
          <div className="skills-grid">
            {Object.entries(CLASS_TALENTS).map(([id, talent]) => (
              <article className="training-card" key={id}>
                <h4>
                  {id === 'signature' ? CLASS_PATHS[p.classId!].signature : talent.name} ·{' '}
                  {p.classTalents?.[id as ClassTalent] ?? 0}/{talent.max}
                </h4>
                <p>{talent.description}</p>
                <button
                  disabled={
                    !classPoints(p) || (p.classTalents?.[id as ClassTalent] ?? 0) >= talent.max
                  }
                  onClick={() => send('class', { action: 'talent', id })}
                >
                  Learn rank
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
