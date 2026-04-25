/**
 * AgentStudioVideo — the Agent Studio tour composition.
 *
 * Showcases agent creation and customization in the /v2 route.
 * Five scenes, 28 seconds, reuses shared SceneHook and SceneCTA.
 */
import { Stage, Soundtrack } from '../../common/assets/player'
import { SceneHook, SceneCTA } from '../../common/scenes'
import { SceneBrowserAgents, SceneAgentConfig, SceneTeamGlance } from './scenes'
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
  // Captions/taglines are raw English keys; shared scenes translate them
  // via `useStageT()` so the in-player language toggle takes effect.
  return (
    <Stage
      duration={28}
      background={BG_LIGHT}
      backgroundTransitions={[{ start: 16.5, end: 17.2, color: BG_DARK }]}
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
      <SceneBrowserAgents start={2.4} end={10} />
      <SceneAgentConfig start={9.9} end={17} />
      <SceneTeamGlance start={16.9} end={22} />
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
