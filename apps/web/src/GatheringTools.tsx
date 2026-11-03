import { GATHERING_SKILLS, TOOL_TYPES } from '@ros/game-data';
import { activeGatheringTool, type Player } from '@ros/shared';
import { ToolIcon } from './ToolIcon';
export function GatheringTools({
  player,
  onEquip,
}: {
  player: Player;
  onEquip: (id: string) => void;
}) {
  return (
    <>
      <h3>Gathering tools</h3>
      <div className="starter-tools">
        {GATHERING_SKILLS.map((skill) => {
          const active = activeGatheringTool(player, skill),
            wood = `wood-${TOOL_TYPES[skill].id}`,
            iron = `iron-${TOOL_TYPES[skill].id}`;
          return (
            <div key={skill}>
              <ToolIcon id={active.id} />
              <span>{skill}</span>
              <small>{active.material === 'iron' ? 'Iron · 20% faster' : 'Wooden'}</small>
              <button
                aria-label={`Equip wooden ${TOOL_TYPES[skill].name}`}
                aria-pressed={active.id === wood}
                onClick={() => onEquip(wood)}
              >
                Wooden
              </button>
              <button
                aria-label={`Equip iron ${TOOL_TYPES[skill].name}`}
                aria-pressed={active.id === iron}
                disabled={!player.ownedTools?.includes(iron)}
                onClick={() => onEquip(iron)}
              >
                Iron
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
