/**
 * TaskDelegationVideo — tour composition showcasing the full delegation flow
 * from connecting services to delivering artifacts.
 *
 * 40 s, 8 scenes:
 *   1. SceneHook          (0–2.5s)    "Connect everything. Delegate anything."
 *   2. SceneConnectors    (2.4–11s)   Homepage → Sidebar Settings → Modal → Connectors wizard
 *   3. ScenePromptSubmit  (10.9–15s)  Typed prompt leveraging connectors + tools
 *   4. SceneSwarmStream   (14.9–24s)  Real ThreadPreview: steps + streaming + PPTX widget
 *   5. SceneEmailDraft    (23.9–30s)  Gmail compose view with PPTX attachment
 *   6. SceneCollapse      (29.9–32s)  "Connected. Computed. Delivered."
 *   7. SceneCTA           (31.9–40s)  Call to action
 */
import { Stage, Soundtrack } from '../../common/assets/player'
import { SceneHook, SceneCollapse, SceneCTA } from '../../common/scenes'
import {
  SceneConnectors,
  ScenePromptSubmit,
  SceneSwarmStream,
  SceneEmailDraft,
} from './scenes'
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
  onEnded?: () => void
}

export function TaskDelegationVideo({
  autoplay,
  rootId,
  disableKeyboard,
  initialTime,
  hideControls,
  onEnded,
}: TaskDelegationVideoProps) {
  return (
    <Stage
      duration={40}
      background={BG_LIGHT}
      backgroundTransitions={[
        { start: 14.5, end: 15.2, color: BG_DARK },
        { start: 23.5, end: 24.2, color: BG_LIGHT },
        { start: 29.5, end: 30.2, color: BG_DARK },
      ]}
      loop={false}
      autoplay={autoplay}
      persistKey=""
      rootId={rootId}
      disableKeyboard={disableKeyboard}
      initialTime={initialTime}
      hideControls={hideControls}
      onEnded={onEnded}
      onCanvasClick={(_, toggle) => toggle()}
      i18nDict={taskDelegationI18n}
    >
      <Soundtrack src={soundtrackUrl} startOffset={1} />

      {/* 1. Hook */}
      <SceneHook
        start={0}
        end={2.5}
        caption="Connect everything. Delegate anything."
      />

      {/* 2. Homepage → Sidebar Settings click → Modal → Connectors wizard */}
      <SceneConnectors start={2.4} end={11} />

      {/* 3. Prompt with connector badges + submit */}
      <ScenePromptSubmit start={10.9} end={15} />

      {/* 4. Real ThreadPreview with tool steps + PPTX widget */}
      <SceneSwarmStream start={14.9} end={24} />

      {/* 5. Gmail compose with PPTX attachment */}
      <SceneEmailDraft start={23.9} end={30} />

      {/* 6. Cinematic beat */}
      <SceneCollapse
        start={29.9}
        end={32}
        caption="Connected. Computed. Delivered."
      />

      {/* 7. CTA */}
      <SceneCTA
        start={31.9}
        end={40}
        tagline="Now you can."
        ctaLabel="Open devs.new →"
        frictionBadge="No signup · No install · Free"
      />
    </Stage>
  )
}
