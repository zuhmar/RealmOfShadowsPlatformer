import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  QUESTS,
  WOODS_QUESTS,
  CRYSTAL_QUESTS,
  MURKMIRE_QUESTS,
  FROSTFALL_QUESTS,
  STORY,
  MAPS,
  WOODS_MONSTERS,
  itemDefinition,
} from '@ros/game-data';
import { needsTrialWeapons, questStatus, type Player } from '@ros/shared';
import { assetUrl } from './assets';
import { JournalArt } from './JournalArt';
import { QuestSprite } from './QuestSprite';
import { ItemIcon } from './ItemIcon';
import './journal.css';

const chapters = [
  {
    id: 'woods',
    name: 'Whispering Woods',
    npc: 'mira',
    giver: 'Mira',
    place: 'Elderwood Village',
    heading: 'Mira · Village guide',
    quests: [QUESTS['mira-wolves'], ...Object.values(WOODS_QUESTS)],
  },
  {
    id: 'crystal',
    name: 'Crystal Caverns',
    npc: 'mentor',
    giver: 'Cavern Mentor',
    place: 'Cave Bat Roost',
    heading: 'Cavern Mentor · Crystal Caverns',
    quests: Object.values(CRYSTAL_QUESTS),
  },
  {
    id: 'murkmire',
    name: 'Murkmire Swamp',
    npc: 'mirewarden',
    giver: 'Mire Warden',
    place: 'Bog Slime Pools',
    heading: 'Mire Warden · Murkmire Swamp',
    quests: Object.values(MURKMIRE_QUESTS),
  },
  {
    id: 'frostfall',
    name: 'Frostfall Tundra',
    npc: 'frostwarden',
    giver: 'Frost Warden',
    place: 'Snowfang Pass',
    heading: 'Frost Warden · Frostfall Tundra',
    quests: Object.values(FROSTFALL_QUESTS),
  },
] as const;
type Quest = (typeof chapters)[number]['quests'][number];
function unlocked(p: Player, q: Quest) {
  return !('prerequisite' in q) || !!p.quests?.[q.prerequisite]?.claimed;
}
function recommended(p: Player, index: number) {
  if (index === 0 && needsTrialWeapons(p)) return 'mira-wolves';
  return (
    chapters[index].quests.find((q) => unlocked(p, q) && questStatus(p, q.id) !== 'claimed')?.id ??
    chapters[index].quests[0].id
  );
}

export function JournalView({
  player: p,
  panel,
  pending,
  near,
  onClose,
  onQuest,
  onTalk,
  onBrowse,
  crafting,
}: {
  player: Player;
  panel: string;
  pending: boolean;
  near: boolean;
  onClose: () => void;
  onQuest: (id: string, action: 'accept' | 'claim') => void;
  onTalk: (npc: string) => void;
  onBrowse: () => void;
  crafting: ReactNode;
}) {
  const dialog = panel !== 'quests';
  const initial =
    panel === 'crystal-quests'
      ? 1
      : panel === 'murkmire-quests'
        ? 2
        : panel === 'frostfall-quests'
          ? 3
          : Math.max(
              0,
              chapters.findIndex((c) => c.id === p.mapId.split('-')[0]),
            );
  const [chapter, setChapter] = useState(initial);
  const [selected, setSelected] = useState<string>(() => recommended(p, initial));
  const [page, setPage] = useState<'quests' | 'story' | 'crafting'>('quests');
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  const c = chapters[chapter];
  const q: Quest = c.quests.find((q) => q.id === selected) ?? c.quests[0];
  const status = questStatus(p, q.id),
    canStart = unlocked(p, q);
  const kit = q.id === 'mira-wolves' && needsTrialWeapons(p);
  const progress = Math.min(q.target.count, p.quests?.[q.id]?.progress ?? 0);
  const monster = WOODS_MONSTERS[q.target.monsterId];
  const statusText = !canStart
    ? 'Locked'
    : status === 'claimed'
      ? 'Completed'
      : status === 'ready'
        ? 'Ready to turn in'
        : status === 'active'
          ? 'In progress'
          : 'Not accepted';
  const statusIcon = !canStart
    ? 'locked'
    : status === 'claimed'
      ? 'complete'
      : status === 'active'
        ? 'combat'
        : 'quest';
  const rewards = q.reward.items.filter((r) => !kit || r.itemId !== 'elderwood-blade');
  const description =
    q.id === 'mira-wolves' && dialog
      ? kit
        ? 'You earned the sword. Collect the bow, staff and dagger to try every path before choosing your class.'
        : QUESTS['mira-wolves'][
            (
              {
                available: 'offer',
                active: 'active',
                ready: 'ready',
                claimed: 'completed',
              } as const
            )[status]
          ]
      : q.description;
  const changeChapter = (i: number) => {
    setChapter(i);
    setSelected(recommended(p, i));
    setPage('quests');
  };
  return (
    <div className="journal-backdrop" onPointerDown={(e) => e.stopPropagation()}>
      <section
        ref={ref}
        className="journal-view"
        role="dialog"
        aria-modal="true"
        aria-label={dialog ? c.heading : 'Adventure journal'}
        tabIndex={-1}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
          if (e.key === 'Tab') {
            const nodes = Array.from(
              ref.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled),select,input,[tabindex="0"]',
              ) ?? [],
            );
            if (
              e.shiftKey &&
              (document.activeElement === nodes[0] || document.activeElement === ref.current)
            ) {
              e.preventDefault();
              nodes.at(-1)?.focus();
            } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
              e.preventDefault();
              nodes[0]?.focus();
            }
          }
        }}
      >
        <button className="journal-close" aria-label="Close panel" onClick={onClose}>
          <JournalArt name="close" />
        </button>
        <header className="journal-heading">
          <img className="journal-hero" src={assetUrl('/assets/ui/journal/hero.png')} alt="" />
          <div>
            <span className="journal-eyebrow">THE TRAVELER’S COMPANION</span>
            <h2>{dialog ? c.heading : 'Adventure journal.'}</h2>
            <p>
              {dialog
                ? `A moment with ${c.giver}`
                : 'Every trial brings you closer to the Shadow Dragon.'}
            </p>
          </div>
        </header>
        {!dialog && (
          <nav className="journal-pages" aria-label="Journal pages">
            {(['quests', 'story', 'crafting'] as const).map((id, i) => (
              <button key={id} aria-pressed={page === id} onClick={() => setPage(id)}>
                <JournalArt name={(['quest', 'quill', 'combat'] as const)[i]} />
                {['Quests', 'Your story', 'Bram’s forge'][i]}
              </button>
            ))}
          </nav>
        )}
        {page === 'story' ? (
          <article className="journal-story">
            <img
              src={assetUrl('/assets/ui/journal/hero.png')}
              alt="An illustrated journal tracing a journey through the islands"
            />
            <div>
              <span className="journal-eyebrow">THE LAST SURVIVOR</span>
              <h3>{STORY.title}</h3>
              <p>{STORY.prologue}</p>
              {p.originRevelation && (
                <>
                  <h3>{p.originRevelation.title}</h3>
                  <p>{p.originRevelation.text}</p>
                </>
              )}
            </div>
          </article>
        ) : page === 'crafting' ? (
          <div className="journal-crafting">
            <QuestSprite npc id="bram" label="Bram" />
            <div>{crafting}</div>
          </div>
        ) : (
          <>
            {!dialog && (
              <nav className="journal-chapters" aria-label="Island chapters">
                {chapters.map((ch, i) => (
                  <button key={ch.id} aria-pressed={chapter === i} onClick={() => changeChapter(i)}>
                    <span>0{i + 1}</span>
                    {ch.name}
                    <small>
                      {ch.quests.filter((q) => questStatus(p, q.id) === 'claimed').length}/
                      {ch.quests.length}
                    </small>
                  </button>
                ))}
              </nav>
            )}
            <div className="journal-chapter-label">
              <span className="journal-eyebrow">CHAPTER {['I', 'II', 'III', 'IV'][chapter]}</span>
              <h3>{c.name}</h3>
            </div>
            <div className="journal-spread">
              <nav className="journal-quest-list" aria-label={`${c.name} quests`}>
                {c.quests.map((entry, i) => {
                  const s = questStatus(p, entry.id),
                    open = unlocked(p, entry);
                  return (
                    <button
                      key={entry.id}
                      aria-pressed={q.id === entry.id}
                      onClick={() => setSelected(entry.id)}
                    >
                      <JournalArt
                        name={
                          !open
                            ? 'locked'
                            : s === 'claimed'
                              ? 'complete'
                              : s === 'active'
                                ? 'combat'
                                : 'quest'
                        }
                      />
                      <span>
                        <small>TRIAL {i + 1}</small>
                        <b>{entry.title}</b>
                        <small>
                          {!open
                            ? 'Locked'
                            : s === 'claimed'
                              ? 'Completed'
                              : s === 'ready'
                                ? 'Reward ready'
                                : s === 'active'
                                  ? 'In progress'
                                  : 'Available'}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </nav>
              <article
                className={`quest-showcase quest-card ${dialog ? 'npc-dialog' : ''}`}
                key={q.id}
              >
                <div className="quest-giver">
                  <QuestSprite npc id={c.npc} label={c.giver} />
                  <div>
                    <span className="journal-eyebrow">{c.giver}</span>
                    <small>{c.place}</small>
                  </div>
                  <span className={`journal-status quest-status status-${status}`}>
                    <JournalArt name={statusIcon} />
                    {statusText}
                  </span>
                </div>
                <h3>{q.title}</h3>
                <p className="quest-dialogue">{description}</p>
                <div className="quest-objective">
                  <QuestSprite id={q.target.monsterId} label={monster.name} />
                  <div>
                    <span className="journal-eyebrow">
                      {monster.boss ? 'BOSS TRIAL' : 'HUNTING OBJECTIVE'}
                    </span>
                    <h4>{monster.name}</h4>
                    <small>{MAPS[q.target.mapId]?.name}</small>
                    <b>
                      {progress} / {q.target.count} defeated
                    </b>
                    <progress
                      aria-label={
                        q.id === 'mira-wolves'
                          ? 'Wolves defeated for Mira'
                          : `${monster.name} defeated`
                      }
                      value={progress}
                      max={q.target.count}
                    />
                  </div>
                </div>
                {!canStart && 'prerequisite' in q && (
                  <p className="journal-lock-note">
                    <JournalArt name="locked" />
                    Complete “{QUESTS[q.prerequisite].title}” first.
                  </p>
                )}
                <div className="journal-rewards">
                  <span className="journal-eyebrow">
                    {kit ? 'CLASS WEAPON KIT' : 'QUEST REWARDS'}
                  </span>
                  <div className="journal-reward-items">
                    {!kit && (
                      <div className="journal-reward">
                        <JournalArt name="gold" />
                        <span>
                          <b>{q.reward.gold}</b>
                          <small>Gold</small>
                        </span>
                      </div>
                    )}
                    {rewards.map((r) => (
                      <div className="journal-reward" key={r.itemId}>
                        <ItemIcon id={r.itemId} />
                        <span>
                          <b>{itemDefinition(r.itemId)?.name ?? r.itemId}</b>
                          <small>×{r.quantity}</small>
                        </span>
                      </div>
                    ))}
                    {q.id === 'crystal-class-trial' && (
                      <div className="journal-reward">
                        <JournalArt name="combat" />
                        <span>
                          <b>Class choice</b>
                          <small>Unlock your path</small>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <footer className="journal-actions">
                  {dialog && canStart && (status === 'available' || status === 'ready' || kit) && (
                    <button
                      className="journal-ribbon"
                      disabled={!near || pending}
                      onClick={() =>
                        onQuest(q.id, status === 'available' && !kit ? 'accept' : 'claim')
                      }
                    >
                      <JournalArt
                        name={status === 'available' && !kit ? 'purple' : 'gold-button'}
                      />
                      <span>
                        {pending
                          ? 'Saving…'
                          : kit
                            ? 'Collect class weapons'
                            : status === 'available'
                              ? 'Accept quest'
                              : q.id === 'mira-wolves'
                                ? 'Claim rewards'
                                : 'Claim reward'}
                      </span>
                    </button>
                  )}
                  {!dialog && (status !== 'claimed' || kit) && (
                    <button
                      className="journal-ribbon"
                      disabled={!MAPS[p.mapId]?.npcs.some((n) => n.id === c.npc)}
                      onClick={() => onTalk(c.npc)}
                    >
                      <JournalArt name="purple" />
                      <span>Talk to {c.giver}</span>
                    </button>
                  )}
                  {dialog && !near && <small>Walk closer to {c.giver} to continue.</small>}
                  {status === 'active' && (
                    <small>
                      Only kills after acceptance count. Return to {c.giver} when ready.
                    </small>
                  )}
                  {status === 'claimed' && !kit && (
                    <span className="journal-completed">
                      <JournalArt name="complete" />
                      Reward claimed
                    </span>
                  )}
                  {q.id === 'crystal-class-trial' && status === 'claimed' && (
                    <button className="journal-ribbon" onClick={onBrowse}>
                      <JournalArt name="gold-button" />
                      <span>Browse classes</span>
                    </button>
                  )}
                  {!dialog && !MAPS[p.mapId]?.npcs.some((n) => n.id === c.npc) && (
                    <small>
                      Visit {c.giver} in {c.place}.
                    </small>
                  )}
                </footer>
              </article>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
