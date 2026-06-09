/**
 * Self-contained vector illustration of two print-ready ID cards — used to fill
 * marketing space with the app's actual output. No external requests.
 */
interface Props {
  className?: string;
}

function Card() {
  return (
    <g>
      <rect width="170" height="108" rx="9" fill="#ffffff" stroke="#e7e0d4" strokeWidth="1.5" />
      {/* orange header */}
      <path
        d="M0 9 a9 9 0 0 1 9 -9 h152 a9 9 0 0 1 9 9 v21 H0 Z"
        fill="hsl(var(--primary))"
      />
      <circle cx="17" cy="15" r="7.5" fill="#ffffff" fillOpacity="0.9" />
      <rect x="32" y="9" width="100" height="5" rx="2.5" fill="#ffffff" fillOpacity="0.95" />
      <rect x="32" y="18" width="70" height="3.5" rx="1.75" fill="#ffffff" fillOpacity="0.7" />
      {/* photo */}
      <rect x="12" y="40" width="40" height="52" rx="4" fill="#e9edf2" stroke="#dfe4ea" />
      <circle cx="32" cy="58" r="9" fill="#b8c2cc" />
      <path d="M19 90 a13 11 0 0 1 26 0 Z" fill="#b8c2cc" />
      {/* text lines */}
      <rect x="62" y="44" width="94" height="7" rx="3.5" fill="#2c3340" />
      <rect x="62" y="59" width="78" height="4.5" rx="2.25" fill="#9aa4b0" />
      <rect x="62" y="71" width="88" height="4.5" rx="2.25" fill="#9aa4b0" />
      <rect x="62" y="83" width="62" height="4.5" rx="2.25" fill="#9aa4b0" />
    </g>
  );
}

export function IdCardArt({ className }: Props) {
  return (
    <svg
      viewBox="0 0 320 230"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Print-ready ID cards"
    >
      <g transform="translate(8 26) rotate(-6)" opacity="0.92">
        <Card />
      </g>
      <g transform="translate(135 96) rotate(5)">
        <Card />
      </g>
    </svg>
  );
}
