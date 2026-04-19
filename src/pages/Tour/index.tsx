/**
 * Product tour route — `/tour`.
 *
 * Hosts the five-scene 30-second DEVS story inside a full-viewport Stage.
 * Everything visible (home page, agent swarm, sphere, captions) is rendered
 * from real product components — the only things defined locally are the
 * tour-specific primitives (browser chrome, agent SVG nodes, playhead
 * controls). See `src/tour/` for details.
 *
 * The tour is English-only at the moment but uses the project's real
 * `useI18n(tourI18n)` pipeline so additional locales can be dropped in
 * without touching scene code.
 */
import { useEffect } from 'react'
import { Stage, useTime, clamp } from './components/animations'
import {
  SceneCTA,
  SceneCollapse,
  SceneOpen,
  ScenePromise,
  SceneSwarm,
} from './components/scenes'
import { TourSoundtrack } from './components/TourSoundtrack'

// Scene boundaries (must match the `start`/`end` props below).
const SCENE_ENDS = [9.5, 14.5, 17.5, 24, 30] as const

// Persistent dark backdrop that fades in mid-scene-3 and stays until the
// end. Guarantees scenes 3→4→5 never reveal the Stage's light background
// during crossfades.
function DarkFade({
  start = 13.0,
  end = 14.3,
}: {
  start?: number
  end?: number
}) {
  const t = useTime()
  const p = clamp((t - start) / (end - start), 0, 1)
  if (p <= 0) return null
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'oklch(12% 0.0015 253.83)',
        opacity: p,
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  )
}

export function TourPage() {
  // Force light theme for the duration of the tour — the product demo always
  // looks its best on the bright canvas. A MutationObserver keeps the `<html>`
  // class set to `light` even if the Providers theme effect re-asserts `dark`
  // (e.g., the user flips a setting while the tour is open).
  useEffect(() => {
    const root = document.documentElement
    const hadDark = root.classList.contains('dark')
    const hadLight = root.classList.contains('light')

    const enforce = () => {
      if (root.classList.contains('dark')) root.classList.remove('dark')
      if (!root.classList.contains('light')) root.classList.add('light')
    }
    enforce()

    const observer = new MutationObserver(enforce)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => {
      observer.disconnect()
      if (hadDark) root.classList.add('dark')
      if (!hadLight) root.classList.remove('light')
    }
  }, [])

  return (
    <div
      id="tour-root"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'oklch(12% 0.0015 253.83)',
        zIndex: 1000,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Blinking caret used by TypedUrl during Scene 1. */}
      <style>{`@keyframes devs-caret { 50% { opacity: 0; } }`}</style>

      <Stage
        width={1920}
        height={1080}
        duration={30}
        background="oklch(97.02% 0.0015 253.83)"
        loop={false}
        persistKey=""
        onCanvasClick={(time, toggle) => {
          if (time >= SCENE_ENDS[3]) {
            window.location.href = 'https://devs.new'
          } else {
            toggle()
          }
        }}
      >
        <TourSoundtrack startOffset={2} />
        <DarkFade start={14.3} end={15.3} />
        <SceneOpen start={0} end={9.5} />
        <SceneSwarm start={9.3} end={14.6} />
        <SceneCollapse start={14.4} end={17.5} />
        <ScenePromise start={17.3} end={24.2} />
        <SceneCTA start={24} end={30} />
      </Stage>
    </div>
  )
}
