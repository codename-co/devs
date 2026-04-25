/**
 * TaskDelegationVideo — tour composition showcasing the delegation flow
 * from prompt to delivered artifacts.
 *
 * 28 s, 6 scenes:
 *   1. SceneHook        (0–2.5s)    "Stop chatting. Start delegating."
 *   2. ScenePromptSubmit (2.4–6s)    Browser chrome + typed prompt + submit
 *   3. SceneBoardView   (5.9–13s)   Kanban board with animated task cards
 *   4. SceneArtifacts   (12.9–19s)  Completed task + artifact panel
 *   5. SceneCollapse    (18.9–21s)  "Delegated. Delivered. Done."
 *   6. SceneCTA         (20.9–28s)  Call to action
 */
import { Stage, Soundtrack } from '../../common/assets/player'
import { SceneHook, SceneCollapse, SceneCTA } from '../../common/scenes'
import { ScenePromptSubmit, SceneBoardView, SceneArtifacts } from './scenes'
import taskDelegationI18n from './i18n'
import soundtrackUrl from '../../common/assets/starostin-promo-promotional-showreel-music-478259.mp3'

const BG_LIGHT = '#f8f9fb'
const BG_DARK = 'oklch(12% 0.0015 253.83)'

interface TaskDelegationVideoProps {
  autoplay?: boolean
  rootId?: string
  disableKeyboard?: boolean
  initialTime?: number
  hideControls?: boolean
}

export function TaskDelegationVideo({ autoplay, rootId, disableKeyboard, initialTime, hideControls }: TaskDelegationVideoProps) {
  // Captions/taglines are passed as raw English keys; shared scenes
  // translate them via `useStageT()` so the in-player language toggle
  // takes effect.
  return (
    <Stage
      duration={28}
      background={BG_LIGHT}
      backgroundTransitions={[
        { start: 5.5, end: 6.2, color: BG_DARK },
        { start: 12.5, end: 13.2, color: BG_LIGHT },
        { start: 18.5, end: 19.2, color: BG_DARK },
      ]}
      loop={false}
      autoplay={autoplay}
      persistKey=""
      rootId={rootId}
      disableKeyboard={disableKeyboard}
      initialTime={initialTime}
      hideControls={hideControls}
      onCanvasClick={(_, toggle) => toggle()}
      i18nDict={taskDelegationI18n}
    >
      <Soundtrack src={soundtrackUrl} startOffset={1} />

      <SceneHook
        start={0}
        end={2.5}
        caption="Stop chatting. Start delegating."
      />
      <ScenePromptSubmit start={2.4} end={6} />
      <SceneBoardView start={5.9} end={13} />
      <SceneArtifacts start={12.9} end={19} />
      <SceneCollapse
        start={18.9}
        end={21}
        caption="Delegated. Delivered. Done."
      />
      <SceneCTA
        start={20.9}
        end={28}
        tagline="Now you can."
        ctaLabel="Open devs.new →"
        frictionBadge="No signup · No install · Free"
      />
    </Stage>
  )
}
