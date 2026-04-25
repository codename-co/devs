/**
 * InboxWorkflowVideo — tour composition showcasing the email-like inbox
 * workflow for managing tasks and conversations.
 *
 * 26 s, 5 scenes:
 *   1. SceneHook        (0–2.5s)     "AI that reports back to you."
 *   2. SceneInboxFull   (2.4–10s)    Thread list + thread preview
 *   3. SceneTranscript  (9.9–16s)    Chronological event timeline
 *   4. SceneTagsSearch  (15.9–20s)   Search, tag, organize
 *   5. SceneCTA         (19.9–26s)   Call to action
 */
import { Stage, Soundtrack } from '../../common/assets/player'
import { SceneHook, SceneCTA } from '../../common/scenes'
import { SceneInboxFull, SceneTranscript, SceneTagsSearch } from './scenes'
import inboxWorkflowI18n from './i18n'
import soundtrackUrl from '../../common/assets/starostin-promo-promotional-showreel-music-478259.mp3'

const BG_LIGHT = '#f8f9fb'
const BG_DARK = 'oklch(12% 0.0015 253.83)'

interface InboxWorkflowVideoProps {
  autoplay?: boolean
  rootId?: string
  disableKeyboard?: boolean
  initialTime?: number
  hideControls?: boolean
}

export function InboxWorkflowVideo({ autoplay, rootId, disableKeyboard, initialTime, hideControls }: InboxWorkflowVideoProps) {
  // Captions/taglines are raw English keys; shared scenes translate them
  // via `useStageT()` so the in-player language toggle takes effect.
  return (
    <Stage
      duration={26}
      background={BG_LIGHT}
      backgroundTransitions={[{ start: 19.5, end: 20.2, color: BG_DARK }]}
      loop={false}
      autoplay={autoplay}
      persistKey=""
      rootId={rootId}
      disableKeyboard={disableKeyboard}
      initialTime={initialTime}
      hideControls={hideControls}
      onCanvasClick={(_, toggle) => toggle()}
      i18nDict={inboxWorkflowI18n}
    >
      <Soundtrack src={soundtrackUrl} startOffset={1} />

      <SceneHook
        start={0}
        end={2.5}
        caption="AI that reports back to you."
      />
      <SceneInboxFull start={2.4} end={10} />
      <SceneTranscript start={9.9} end={16} />
      <SceneTagsSearch start={15.9} end={20} />
      <SceneCTA
        start={19.9}
        end={26}
        tagline="Now you can."
        ctaLabel="Open devs.new →"
        frictionBadge="No signup · No install · Free"
      />
    </Stage>
  )
}
