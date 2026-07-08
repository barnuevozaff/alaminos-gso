import heroBg from '../assets/hero-bg.png'

// Decorative artwork for the hero banner — a real illustrated asset, not
// hand-coded SVG. Anchored bottom-right so the building stays visible
// even when the banner's aspect ratio is much wider than the source art.
export default function HeroBackground() {
  return (
    <img
      src={heroBg}
      alt=""
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', objectPosition: 'right 32%',
        zIndex: -1, pointerEvents: 'none',
      }}
    />
  )
}
