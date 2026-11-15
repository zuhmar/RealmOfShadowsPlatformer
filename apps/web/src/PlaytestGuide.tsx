import { useState } from 'react';
import {
  MAPS,
  QUESTS,
  WOODS_QUESTS,
  CRYSTAL_QUESTS,
  MURKMIRE_QUESTS,
  FROSTFALL_QUESTS,
} from '@ros/game-data';
import { recoveryBlock, unstuckBlock, type Player } from '@ros/shared';
const guild = 'https://discord.com/channels/1473009671148142785';
const questOrder = [
  ...new Set([
    'mira-wolves',
    ...Object.keys(WOODS_QUESTS),
    ...Object.keys(CRYSTAL_QUESTS),
    ...Object.keys(MURKMIRE_QUESTS),
    ...Object.keys(FROSTFALL_QUESTS),
  ]),
];
export function AdventureHint({ player }: { player: Player }) {
  const id = questOrder.find((id) => !player.quests?.[id]?.claimed);
  const quest = id ? QUESTS[id as keyof typeof QUESTS] : undefined;
  if (!quest || !id)
    return (
      <p>
        Main test quest chain completed. Try housing, the Mirebound Arena or Frostbound
        Battlegrounds.
      </p>
    );
  const state = player.quests?.[id];
  const npc =
    'npcId' in quest
      ? (
          {
            mentor: 'Cavern Mentor',
            mirewarden: 'Mire Warden',
            frostwarden: 'Frost Warden',
            mira: 'Mira',
          } as Record<string, string>
        )[quest.npcId]
      : 'Mira';
  const location =
    npc === 'Mira'
      ? 'Elderwood Village'
      : npc === 'Cavern Mentor'
        ? MAPS.crystal.name
        : npc === 'Mire Warden'
          ? MAPS.murkmire.name
          : MAPS.frostfall.name;
  return (
    <article className="adventure-hint">
      <h3>Next: {quest.title}</h3>
      <p>
        {!state
          ? `Speak to ${npc} in ${location} and accept this quest before hunting.`
          : state.progress >= quest.target.count
            ? `Return to ${npc} in ${location} to claim your reward.`
            : `${Math.min(state.progress, quest.target.count)} / ${quest.target.count} · Hunt in ${MAPS[quest.target.mapId].name}.`}
      </p>
      <small>{quest.description}</small>
    </article>
  );
}
export function PlaytestGuide({
  player,
  send,
  openSettings,
}: {
  player: Player;
  send: (type: string, value: unknown) => void;
  openSettings: () => void;
}) {
  const [confirmReturn, setConfirmReturn] = useState(false);
  const topics = [
    [
      'Start your journey',
      'Speak to Mira in Elderwood and accept your quest before hunting. Claim the first quest reward to receive all four starter weapon types. Equip them from Bag to try each style.',
    ],
    [
      'Choose your class',
      'Defeat Forest Bear, reach level 11 and enter Crystal Caverns. Complete the Cavern Mentor’s class trial to unlock Knight, Archer, Mage or Rogue. Class skins require that class; later class changes cost gold.',
    ],
    [
      'Gather and craft',
      'Stand beside a node and interact. Gathering continues until you move, attack or take damage. Wooden tools work automatically; crafted tools must be equipped. Hunt for recipe scrolls; collecting one unlocks its recipe. Craft learned recipes at the matching bench. Smelting uses 20 ore per bar.',
    ],
    [
      'Improve your gear',
      'Open Bag and click equipment for its actions. Identify monster-dropped gear anywhere for gold to reveal its rarity and attributes. Crafted equipment has fixed attributes. Cooking grants buffs; Alchemy makes potions.',
    ],
    [
      'Travel and bosses',
      'Visit an area through its portal before teleporting there from the World Map. Teleporting spends a crystal; boss entries also spend a boss key every time. The boss entrance is high above the third hunt. Move out of special-attack warnings.',
    ],
    [
      'Build a home',
      'Use the plot platform in central Elderwood. Build your house through its stages, then interact with the finished house to enter. Use Decorate to place crafted furniture and loot displays. Interact with a placed chest for separate house storage. Your house is private unless you invite someone.',
    ],
    [
      'Mirebound Arena · Murkmire',
      'Enter the crossed-swords gateway in Bog Slime Pools at level 21 after unlocking Murkmire. You and your opponent both press Ready. Duels use actual gear and trained skills. No potions, ranked rewards or PvE loot. Leaving an active duel forfeits it.',
    ],
    [
      'Frostbound Battlegrounds · Frostfall',
      'Enter the fortress gateway in Snowfang Pass after unlocking Frostfall at level 31. Start solo or share your party code with up to three friends. Friends join from their own lobby and press Ready before the leader starts. Clear ten waves for the completion reward. Leaving removes you from that run.',
    ],
  ];
  return (
    <div className="playtest-guide">
      <span className="eyebrow">PLAYTEST BUILD · CONTENT THROUGH FROSTFALL</span>
      <AdventureHint player={player} />
      <h3>Controls</h3>
      <p>
        Move: A/D or ←/→ · Climb: W/S or ↑/↓ · Jump: Space · Attack: J · Special: K · Interact: E.
        On phones, use the on-screen buttons. Manual movement cancels AUTO.
      </p>
      {topics.map(([title, text]) => (
        <details key={title}>
          <summary>{title}</summary>
          <p>{text}</p>
        </details>
      ))}
      <h3>Test scope</h3>
      <p>
        Elderwood, Whispering Woods, Crystal Caverns, Murkmire and Frostfall are available. Later
        hunting islands are not part of this test. Cutscenes are on hold and gameplay playback is
        disabled. Arena is currently unranked and does not match by level. Quest and wave balance
        are still being tuned.
      </p>
      <p>
        <a href={`${guild}/1569416223228301433`} target="_blank" rel="noreferrer">
          Report a bug in Discord
        </a>{' '}
        ·{' '}
        <a href={`${guild}/1569416221726740612`} target="_blank" rel="noreferrer">
          Share a suggestion
        </a>
      </p>
      <p>
        For a bug, include your character name, map, device/browser, what you did, what happened and
        a screenshot if possible. Never share your password.
      </p>
      <button onClick={openSettings}>Sound, display & AUTO settings</button>
      <h3>Stuck or need a way home?</h3>
      <p>
        Unstuck returns you to this map’s entrance. Return to Elderwood is free. Both require 10
        seconds without attacking or taking damage and share a 60-second cooldown. In Arena or
        Battlegrounds, use that mode’s Leave button.
      </p>
      <div className="recovery-actions">
        <button
          onClick={() => send('recover', 'unstuck')}
          title={unstuckBlock(player, Date.now()) ?? undefined}
        >
          Unstuck
        </button>
        <button onClick={() => setConfirmReturn(true)}>Return to Elderwood</button>
      </div>
      {confirmReturn && (
        <div className="recovery-confirm" role="group" aria-label="Confirm return to Elderwood">
          <p>
            {recoveryBlock(player, Date.now()) ??
              'Leave this map and return to Elderwood? Your items and progress are kept.'}
          </p>
          <button
            onClick={() => {
              send('recover', 'village');
              setConfirmReturn(false);
            }}
          >
            Confirm return
          </button>
          <button onClick={() => setConfirmReturn(false)}>Stay here</button>
        </div>
      )}
    </div>
  );
}
