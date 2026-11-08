import { provisionRecipe } from '@ros/game-data';
export function ProvisionIcon({ id }: { id: string }) {
  const r = provisionRecipe(id);
  if (!r) return null;
  const food = r.skill === 'Cooking',
    crystal = r.characterLevel === 11,
    color =
      r.effect === 'health'
        ? '#ec6188'
        : r.effect === 'mana'
          ? '#73a9ff'
          : crystal
            ? '#9cceec'
            : '#e5b86d';
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 48 48"
      role="img"
      aria-label={r.name}
      style={{ flexShrink: 0, verticalAlign: 'middle' }}
    >
      {food ? (
        <>
          <ellipse cx="24" cy="35" rx="20" ry="7" fill="#c2c9e0" stroke="#30263f" strokeWidth="2" />
          <path
            d="M7 27h34q-2 13-17 13T7 27"
            fill={crystal ? '#576b9b' : '#a87041'}
            stroke="#30263f"
            strokeWidth="2"
          />
          <ellipse cx="24" cy="26" rx="17" ry="6" fill={color} stroke="#30263f" strokeWidth="2" />
          <path d="M14 25q9-11 20 0-10 9-20 0l-4-4v8z" fill={crystal ? '#c2f0f2' : '#ffe8af'} />
          <circle cx="31" cy="24" r="1.4" fill="#30263f" />
          <path
            d="m18 28 3-3m5 2 2-3M15 17q-5-4 0-7m11 7q-5-4 0-7"
            fill="none"
            stroke="#b9e0af"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <path
            d="M18 7h12v12l10 14q5 11-16 11T8 33l10-14z"
            fill="#b4d4df"
            stroke="#30263f"
            strokeWidth="2.5"
          />
          <path d="m16 26-7 10q0 6 15 6t15-6l-7-10z" fill={color} />
          <rect
            x="17"
            y="4"
            width="14"
            height="8"
            rx="2"
            fill="#a87b4c"
            stroke="#30263f"
            strokeWidth="2"
          />
          <path
            d="M17 18v5l-5 10"
            fill="none"
            stroke="#f2ffff"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <ellipse cx="26" cy="30" rx="7" ry="2" fill="#fff" opacity=".35" />
        </>
      )}
    </svg>
  );
}
