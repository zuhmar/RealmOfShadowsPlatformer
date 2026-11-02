import { QUESTS, ITEMS, STORY, weaponProfile } from '@ros/game-data';
import { questStatus, needsTrialWeapons, type Player } from '@ros/shared';
const quest = QUESTS['mira-wolves'];
export function QuestPanel({
  player,
  dialog,
  pending,
  nearMira,
  onAction,
  onTalk,
}: {
  player: Player;
  dialog: boolean;
  pending: boolean;
  nearMira: boolean;
  onAction: (action: 'accept' | 'claim') => void;
  onTalk: () => void;
}) {
  const status = questStatus(player);
  const kitPending = needsTrialWeapons(player);
  const progress = Math.min(quest.target.count, player.quests?.[quest.id]?.progress ?? 0);
  const lines = {
    available: quest.offer,
    active: quest.active,
    ready: quest.ready,
    claimed: quest.completed,
  };
  return (
    <article className={`quest-card ${dialog ? 'npc-dialog' : ''}`}>
      <span>{quest.chapter}</span>
      <h3>{quest.title}</h3>
      {!dialog && (
        <div className="story-prologue">
          <b>{STORY.title}</b>
          <p>{STORY.prologue}</p>
        </div>
      )}
      <p>
        {dialog
          ? kitPending
            ? 'You already earned the sword. Take a bow, staff and dagger as well, and try the Archer, Mage and Rogue paths before choosing your class.'
            : lines[status]
          : quest.description}
      </p>
      <div className="quest-status">
        {
          (
            {
              available: 'Not accepted',
              active: 'In progress',
              ready: 'Ready to turn in',
              claimed: 'Completed',
            } as const
          )[status]
        }
      </div>
      {status !== 'available' && (
        <>
          <progress
            aria-label="Wolves defeated for Mira"
            value={progress}
            max={quest.target.count}
          />
          <b className="quest-progress">
            Wolves defeated · {progress} / {quest.target.count}
          </b>
        </>
      )}
      <div className="quest-rewards">
        <span>{kitPending ? 'CLASS WEAPON KIT' : 'QUEST REWARD'}</span>
        <>{!kitPending && <b>◈ {quest.reward.gold} gold</b>}</>
        {quest.reward.items
          .filter((reward) => !kitPending || reward.itemId !== 'elderwood-blade')
          .map((reward) => {
            const item = ITEMS[reward.itemId];
            return (
              <b key={item.id}>
                {item.icon} {item.name}{' '}
                <small>
                  {weaponProfile(item.id).className} · +{item.bonus} attack
                </small>
              </b>
            );
          })}
      </div>
      <p>Equip these weapons from your Bag to try each path before choosing your class.</p>
      {dialog && status === 'available' && (
        <button
          className="primary"
          disabled={pending || !nearMira}
          onClick={() => onAction('accept')}
        >
          {pending ? 'Saving…' : 'Accept quest'}
        </button>
      )}
      {dialog && (status === 'ready' || kitPending) && (
        <button
          className="primary"
          disabled={pending || !nearMira}
          onClick={() => onAction('claim')}
        >
          {pending ? 'Saving…' : kitPending ? 'Collect class weapons' : 'Claim rewards'}
        </button>
      )}
      {dialog && !nearMira && <p>Walk closer to Mira to continue.</p>}
      {!dialog && (status !== 'claimed' || kitPending) && (
        <>
          <p>
            {kitPending
              ? 'Return to Mira to collect your bow, staff and dagger. Your gold and sword will not be granted again.'
              : status === 'available'
                ? 'Find Mira beside the village path to begin.'
                : status === 'ready'
                  ? 'Return to Mira in Elderwood Village to claim your reward.'
                  : 'Manual and AUTO Wolf kills count. Offline training does not advance this quest.'}
          </p>
          <button className="secondary" disabled={!nearMira} onClick={onTalk}>
            Talk to Mira
          </button>
        </>
      )}
      {status === 'claimed' && !kitPending && (
        <p className="quest-complete">
          ✓ Reward claimed. Your journey to the Shadow Dragon has begun.
        </p>
      )}
    </article>
  );
}
