/**
 * ProductTourVideo — the specific DEVS product tour composition.
 *
 * This component wires up the generic video player (`Stage` from `player/`)
 * with the five tour-specific scenes and the soundtrack. It can be embedded
 * anywhere — the route page (`../index.tsx`) is just a thin wrapper.
 */
import { Stage, Soundtrack } from '../../common/assets/player'
import {
  SceneCTA,
  SceneCollapse,
  SceneOpen,
  ScenePromise,
  SceneSwarm,
} from './scenes'
import tourI18n from './i18n'
import soundtrackUrl from '../../common/assets/starostin-promo-promotional-showreel-music-478259.mp3'

const BG_LIGHT = 'oklch(97.02% 0.0015 253.83)'
const BG_DARK = 'oklch(12% 0.0015 253.83)'

interface ProductTourVideoProps {
  autoplay?: boolean
  rootId?: string
  disableKeyboard?: boolean
  initialTime?: number
  hideControls?: boolean
  onEnded?: () => void
}

export function ProductTourVideo({ autoplay, rootId, disableKeyboard, initialTime, hideControls, onEnded }: ProductTourVideoProps) {
  return (
    <Stage
      duration={30}
      background={BG_LIGHT}
      backgroundTransitions={[{ start: 14.8, end: 15.6, color: BG_DARK }]}
      loop={false}
      autoplay={autoplay}
      persistKey=""
      rootId={rootId}
      disableKeyboard={disableKeyboard}
      initialTime={initialTime}
      hideControls={hideControls}
      onEnded={onEnded}
      onCanvasClick={(_, toggle) => toggle()}
      i18nDict={tourI18n}
    >
      <Soundtrack src={soundtrackUrl} startOffset={2} />
      <SceneOpen start={0} end={4.0} />
      <SceneSwarm start={3.9} end={15.0} />
      <SceneCollapse start={14.9} end={18.0} />
      <ScenePromise start={17.9} end={23.0} />
      <SceneCTA start={22.9} end={30} />
    </Stage>
  )
}
