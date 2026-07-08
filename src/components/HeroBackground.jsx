// Decorative composition for the hero banner: flowing contour waves, a
// soft radial glow, a faint dot-grid, thin ring outlines, and a line-art
// silhouette of the municipal hall anchored to the bottom-right edge.
// Same visual language as SidebarBackground, wide aspect ratio.
export default function HeroBackground() {
  return (
    <svg
      viewBox="0 0 1600 420"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        <filter id="hero-blur-lg" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="70" />
        </filter>
        <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft glow, upper right */}
      <circle cx="1420" cy="90" r="240" fill="url(#hero-glow)" filter="url(#hero-blur-lg)" />

      {/* Flowing contour waves */}
      <g fill="none" stroke="#ffffff" strokeLinecap="round">
        <path d="M -50 50 C 300 10, 700 90, 1000 40 S 1400 0, 1650 60" strokeWidth="1.6" strokeOpacity="0.09" />
        <path d="M -50 100 C 350 140, 650 60, 1000 120 S 1400 160, 1650 90" strokeWidth="0.9" strokeOpacity="0.06" />
        <path d="M -50 150 C 300 190, 700 120, 1050 170 S 1350 210, 1650 140" strokeWidth="1.3" strokeOpacity="0.08" />
        <path d="M -50 200 C 320 170, 680 240, 1020 190 S 1380 150, 1650 210" strokeWidth="0.7" strokeOpacity="0.05" />
        <path d="M -50 250 C 340 290, 660 220, 1000 270 S 1400 310, 1650 240" strokeWidth="1.4" strokeOpacity="0.08" />
      </g>
      <g fill="none" stroke="#ffffff" strokeLinecap="round">
        <path d="M 150 -30 C 100 130, 220 260, 140 380 S 90 460, 150 450" strokeWidth="1.1" strokeOpacity="0.06" />
        <path d="M 450 -30 C 520 150, 380 280, 480 400 S 520 460, 450 450" strokeWidth="0.8" strokeOpacity="0.05" />
        <path d="M 800 -30 C 730 140, 880 270, 780 390 S 840 460, 800 450" strokeWidth="1.3" strokeOpacity="0.07" />
      </g>

      {/* Thin ring outlines */}
      <circle cx="1300" cy="210" r="200" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.07" />
      <circle cx="1520" cy="330" r="130" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.06" />

      {/* Dot grid */}
      <g fill="#ffffff" opacity="0.12">
        {Array.from({ length: 6 }).map((_, row) =>
          Array.from({ length: 5 }).map((_, col) => (
            <circle key={`${row}-${col}`} cx={70 + col * 16} cy={40 + row * 16} r="1.4" />
          ))
        )}
      </g>

      {/* Municipal hall silhouette, anchored bottom-right */}
      <g fill="none" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1.4" strokeLinejoin="round">
        {/* tree beside the building */}
        <line x1="1100" y1="420" x2="1100" y2="360" strokeOpacity="0.14" />
        <circle cx="1100" cy="338" r="20" strokeOpacity="0.12" />
        <circle cx="1088" cy="350" r="15" strokeOpacity="0.12" />
        <circle cx="1112" cy="350" r="15" strokeOpacity="0.12" />

        {/* main wing */}
        <rect x="1150" y="270" width="410" height="150" />
        <line x1="1150" y1="272" x2="1560" y2="272" />
        {Array.from({ length: 39 }).map((_, i) => (
          <line key={i} x1={1155 + i * 10.5} y1="262" x2={1155 + i * 10.5} y2="272" strokeOpacity="0.1" />
        ))}

        {/* left wing arches */}
        <path d="M 1180 400 L 1180 365 A 13 13 0 0 1 1206 365 L 1206 400" />
        <path d="M 1224 400 L 1224 365 A 13 13 0 0 1 1250 365 L 1250 400" />
        <path d="M 1268 400 L 1268 365 A 13 13 0 0 1 1294 365 L 1294 400" />
        {/* right wing arches */}
        <path d="M 1406 400 L 1406 365 A 13 13 0 0 1 1432 365 L 1432 400" />
        <path d="M 1450 400 L 1450 365 A 13 13 0 0 1 1476 365 L 1476 400" />
        <path d="M 1494 400 L 1494 365 A 13 13 0 0 1 1520 365 L 1520 400" />

        {/* tower */}
        <rect x="1328" y="145" width="48" height="160" />
        <path d="M 1328 225 L 1376 225" strokeOpacity="0.12" />
        <path d="M 1343 305 L 1343 270 A 9 9 0 0 1 1361 270 L 1361 305" />
        <rect x="1338" y="78" width="26" height="67" />
        <path d="M 1332 78 L 1351 36 L 1370 78 Z" />
        <line x1="1351" y1="36" x2="1351" y2="-4" />
        <path d="M 1351 -4 L 1379 4 L 1351 12 Z" fill="#ffffff" fillOpacity="0.1" stroke="none" />
      </g>
    </svg>
  )
}
