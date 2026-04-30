/**
 * AgentStudioVideo — the Agent Studio tour composition.
 *
 * Showcases the full agent creation flow: browse → AI-assisted describe →
 * form review → test playground.
 *
 * 36 s, 6 scenes:
 *   1. SceneHook           (0–2.5s)      "What if AI worked your way?"
 *   2. SceneBrowseAgents   (2.4–10s)     Agent list → click "New agent" → wizard chooser
 *   3. SceneAIDescribe     (9.9–17s)     Type description → AI streams config
 *   4. SceneFormReview     (16.9–23s)    Review generated form → click "Test first"
 *   5. SceneTestPlayground (22.9–30s)    Playground with mock conversation
 *   6. SceneCTA            (29.9–36s)    Call to action
 */
import { Stage, Soundtrack } from '../../common/assets/player'
import { SceneHook, SceneCTA } from '../../common/scenes'
import {
  SceneBrowseAgents,
  SceneAIDescribe,
  SceneFormReview,
  SceneTestPlayground,
} from './scenes'
import agentStudioI18n from './i18n'
import soundtrackUrl from '../../common/assets/starostin-promo-promotional-showreel-music-478259.mp3'

const BG_LIGHT = 'oklch(97.02% 0.0015 253.83)'
const BG_DARK = 'oklch(12% 0.0015 253.83)'

interface AgentStudioVideoProps {
  autoplay?: boolean
  rootId?: string
  disableKeyboard?: boolean
  initialTime?: number
  hideControls?: boolean
  onEnded?: () => void
}

export function AgentStudioVideo({ autoplay, rootId, disableKeyboard, initialTime, hideControls, onEnded }: AgentStudioVideoProps) {
  return (
    <Stage
      duration={36}
      background={BG_LIGHT}
      backgroundTransitions={[{ start: 29.5, end: 30.2, color: BG_DARK }]}
      loop={false}
      autoplay={autoplay}
      persistKey=""
      rootId={rootId}
      disableKeyboard={disableKeyboard}
      initialTime={initialTime}
      hideControls={hideControls}
      onEnded={onEnded}
      onCanvasClick={(_, toggle) => toggle()}
      i18nDict={agentStudioI18n}
    >
      <Soundtrack src={soundtrackUrl} startOffset={2} />
      <SceneHook start={0} end={2.5} caption="What if AI worked your way?" />
      <SceneBrowseAgents start={2.4} end={10} />
      <SceneAIDescribe start={9.9} end={17} />
      <SceneFormReview start={16.9} end={23} />
      <SceneTestPlayground start={22.9} end={30} />
      <SceneCTA
        start={29.9}
        end={36}
        tagline="Now you can."
        ctaLabel="Open devs.new →"
        frictionBadge="No signup · No install · Free"
      />
    </Stage>
  )
}
