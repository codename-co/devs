/**
 * PrivacyFirstVideo — tour composition emphasizing privacy, offline-first,
 * no-backend architecture.
 *
 * 28 s, 5 scenes:
 *   1. SceneHook          (0–2.5s)    "What leaves your browser? Nothing."
 *   2. SceneBrowserLocal   (2.4–9s)    Padlock + tech labels inside browser chrome
 *   3. SceneBYOK           (8.9–15s)   Settings panel with 6 LLM providers
 *   4. ScenePromise        (14.9–22s)  Promise phrases on dark background
 *   5. SceneCTA            (21.9–28s)  Call to action
 */
import { Stage, Soundtrack } from '../../common/assets/player'
import { SceneHook, ScenePromise, SceneCTA } from '../../common/scenes'
import { SceneBrowserLocal, SceneBYOK } from './scenes'
import privacyFirstI18n from './i18n'
import soundtrackUrl from '../../common/assets/starostin-promo-promotional-showreel-music-478259.mp3'

const BG_LIGHT = '#f8f9fb'
const BG_DARK = 'oklch(12% 0.0015 253.83)'

interface PrivacyFirstVideoProps {
  autoplay?: boolean
  rootId?: string
  disableKeyboard?: boolean
  initialTime?: number
  hideControls?: boolean
  onEnded?: () => void
}

export function PrivacyFirstVideo({ autoplay, rootId, disableKeyboard, initialTime, hideControls, onEnded }: PrivacyFirstVideoProps) {
  // Captions/phrases are raw English keys; shared scenes translate them
  // via `useStageT()` so the in-player language toggle takes effect.
  return (
    <Stage
      duration={28}
      background={BG_LIGHT}
      backgroundTransitions={[{ start: 14.5, end: 15.2, color: BG_DARK }]}
      loop={false}
      autoplay={autoplay}
      persistKey=""
      rootId={rootId}
      disableKeyboard={disableKeyboard}
      initialTime={initialTime}
      hideControls={hideControls}
      onEnded={onEnded}
      onCanvasClick={(_, toggle) => toggle()}
      i18nDict={privacyFirstI18n}
    >
      <Soundtrack src={soundtrackUrl} startOffset={1} />

      <SceneHook
        start={0}
        end={2.5}
        caption="What leaves your browser? Nothing."
      />
      <SceneBrowserLocal start={2.4} end={9} />
      <SceneBYOK start={8.9} end={15} />
      <ScenePromise
        start={14.9}
        end={22}
        phrases={[
          { text: 'No server.', at: 0.4 },
          { text: 'No subscription.', at: 1.6 },
          { text: 'No third party.', at: 2.8 },
          { text: 'Open source.', at: 4.0 },
        ]}
        tagline="OPEN SOURCE · BROWSER-NATIVE · YOURS"
      />
      <SceneCTA
        start={21.9}
        end={28}
        tagline="Now you can."
        ctaLabel="Open devs.new →"
        frictionBadge="No signup · No install · Free"
      />
    </Stage>
  )
}
