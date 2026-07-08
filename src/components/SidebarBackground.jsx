import sidebarBg from '../assets/sidebar-bg.png'

// Decorative artwork for the sidebar — a real illustrated asset, not
// hand-coded SVG. Purely ambient — no interaction.
export default function SidebarBackground() {
  return (
    <img
      src={sidebarBg}
      alt=""
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', objectPosition: 'bottom center',
        zIndex: -1, pointerEvents: 'none',
      }}
    />
  )
}
