import { GATHERING_SKILLS, TOOL_TYPES, toolDurationMultiplier } from '@ros/game-data';
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
              <small>{`${active.name} · ${Math.round((1 - toolDurationMultiplier(active.material)) * 100)}% faster`}</small>
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
              <button
                aria-label={`Equip crystal ${TOOL_TYPES[skill].name}`}
                aria-pressed={active.id === `crystal-${TOOL_TYPES[skill].id}`}
                disabled={
                  player.level < 11 ||
                  !player.ownedTools?.includes(`crystal-${TOOL_TYPES[skill].id}`)
                }
                onClick={() => onEquip(`crystal-${TOOL_TYPES[skill].id}`)}
              >
                Crystal
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
