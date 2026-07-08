// Decorative composition for the sidebar: flowing contour waves, a soft
// radial glow, a faint dot-grid, thin ring outlines, and a line-art
// silhouette of the municipal hall anchored to the bottom edge.
// Purely ambient — no interaction, not tiled.
export default function SidebarBackground() {
  return (
    <svg
      viewBox="0 0 280 1000"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        <filter id="sb-blur-lg" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="55" />
        </filter>
        <radialGradient id="sb-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft glow, upper area */}
      <circle cx="205" cy="110" r="170" fill="url(#sb-glow)" filter="url(#sb-blur-lg)" />

      {/* Flowing contour waves */}
      <g fill="none" stroke="#ffffff" strokeLinecap="round">
        <path d="M -20 60 C 80 20, 180 100, 300 50" strokeWidth="1.4" strokeOpacity="0.09" />
        <path d="M -20 140 C 100 190, 200 90, 300 160" strokeWidth="0.8" strokeOpacity="0.06" />
        <path d="M -20 220 C 60 260, 220 180, 300 240" strokeWidth="1.8" strokeOpacity="0.1" />
        <path d="M -20 300 C 120 340, 180 260, 300 310" strokeWidth="0.7" strokeOpacity="0.05" />
        <path d="M -20 380 C 90 420, 210 340, 300 390" strokeWidth="1.2" strokeOpacity="0.08" />
        <path d="M -20 460 C 110 500, 190 420, 300 470" strokeWidth="1.6" strokeOpacity="0.07" />
        <path d="M -20 540 C 70 580, 230 500, 300 550" strokeWidth="0.9" strokeOpacity="0.06" />
        <path d="M -20 620 C 130 660, 170 580, 300 630" strokeWidth="1.3" strokeOpacity="0.09" />
      </g>
      <g fill="none" stroke="#ffffff" strokeLinecap="round">
        <path d="M 40 -20 C 10 200, 90 400, 40 620 S 10 780, 40 900" strokeWidth="1.1" strokeOpacity="0.07" />
        <path d="M 130 -20 C 170 220, 90 440, 150 660 S 100 800, 130 900" strokeWidth="0.9" strokeOpacity="0.06" />
        <path d="M 210 -20 C 180 240, 250 460, 200 680 S 240 800, 210 900" strokeWidth="1.3" strokeOpacity="0.08" />
      </g>

      {/* Thin ring outlines */}
      <circle cx="210" cy="300" r="140" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.07" />
      <circle cx="60" cy="560" r="110" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.06" />

      {/* Dot grid */}
      <g fill="#ffffff" opacity="0.12">
        {Array.from({ length: 5 }).map((_, row) =>
          Array.from({ length: 4 }).map((_, col) => (
            <circle key={`${row}-${col}`} cx={30 + col * 16} cy={40 + row * 16} r="1.4" />
          ))
        )}
      </g>

      {/* Municipal hall silhouette, anchored to the bottom edge */}
      <g fill="none" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1.4" strokeLinejoin="round">
        {/* small tree, far left */}
        <line x1="14" y1="1000" x2="14" y2="945" strokeOpacity="0.14" />
        <circle cx="14" cy="925" r="16" strokeOpacity="0.12" />
        <circle cx="6" cy="935" r="12" strokeOpacity="0.12" />
        <circle cx="22" cy="935" r="12" strokeOpacity="0.12" />

        {/* main wing */}
        <rect x="30" y="860" width="220" height="140" />
        <line x1="30" y1="862" x2="250" y2="862" />
        {/* balustrade ticks */}
        {Array.from({ length: 21 }).map((_, i) => (
          <line key={i} x1={35 + i * 10.5} y1="852" x2={35 + i * 10.5} y2="862" strokeOpacity="0.1" />
        ))}

        {/* left wing arches */}
        <path d="M 55 940 L 55 905 A 12 12 0 0 1 79 905 L 79 940" />
        <path d="M 95 940 L 95 905 A 12 12 0 0 1 119 905 L 119 940" />
        {/* right wing arches */}
        <path d="M 161 940 L 161 905 A 12 12 0 0 1 185 905 L 185 940" />
        <path d="M 201 940 L 201 905 A 12 12 0 0 1 225 905 L 225 940" />

        {/* tower */}
        <rect x="118" y="700" width="44" height="160" />
        <path d="M 118 780 L 162 780" strokeOpacity="0.12" />
        <path d="M 132 860 L 132 825 A 8 8 0 0 1 148 825 L 148 860" />
        <rect x="128" y="638" width="24" height="62" />
        <path d="M 122 638 L 140 598 L 158 638 Z" />
        <line x1="140" y1="598" x2="140" y2="558" />
        <path d="M 140 558 L 166 566 L 140 574 Z" fill="#ffffff" fillOpacity="0.1" stroke="none" />
      </g>
    </svg>
  )
}
