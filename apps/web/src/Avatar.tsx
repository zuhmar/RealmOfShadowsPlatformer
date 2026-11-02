export function Avatar({
  outfit = 'sage',
  appearance = 'male',
}: {
  outfit?: string;
  appearance?: string;
}) {
  const color = outfit === 'ember' ? '#c38259' : outfit === 'tide' ? '#6c9baf' : '#87a765';
  return (
    <svg viewBox="0 0 80 100" aria-label={`${appearance} ${outfit} adventurer`} role="img">
      <ellipse cx="38" cy="94" rx="26" ry="5" fill="#10291e" opacity=".4" />
      <g stroke="#243c30" strokeWidth="2.6" strokeLinejoin="round">
        <path d="M26 73v19h10V76m9-2v18h10V73" fill="#494e3c" />
        {appearance === 'female' && (
          <rect x="16" y="26" width="18" height="42" rx="8" fill="#694d36" />
        )}
        <rect x="20" y="43" width="38" height="36" rx="9" fill={color} />
        <path d="M25 48h8v20h-8z" fill="#d2dfab" opacity=".5" stroke="none" />
        <rect x="22" y="15" width="34" height="34" rx="12" fill="#ead0a4" />
        <path d="M21 30v-8q0-10 10-10h17q12 0 12 12v3H29v10h-7z" fill="#694d36" />
        <rect x="54" y="50" width="10" height="19" rx="5" fill="#ead0a4" />
        <path d="M64 61l3-32 6 32z" fill="#d6ded2" />
        <path d="M59 62h18m-9 0v13" fill="none" stroke="#756347" strokeWidth="3" />
      </g>
      <circle cx="46" cy="33" r="2" fill="#243c30" />
      <path d="M39 42q5 3 8 0" fill="none" stroke="#b18e6a" strokeWidth="1.4" />
    </svg>
  );
}
