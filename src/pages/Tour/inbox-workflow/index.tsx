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
import { useI18n } from '@/i18n'
import { Stage, Soundtrack } from '../player'
import { SceneHook, SceneCTA } from '../scenes'
import { SceneInboxFull, SceneTranscript, SceneTagsSearch } from './scenes'
import inboxWorkflowI18n from './i18n'
import soundtrackUrl from '../assets/starostin-promo-promotional-showreel-music-478259.mp3'

const BG_LIGHT = '#f8f9fb'
const BG_DARK = 'oklch(12% 0.0015 253.83)'

export function InboxWorkflowVideo() {
  const { t } = useI18n(inboxWorkflowI18n)

  return (
    <Stage
      duration={26}
      background={BG_LIGHT}
      backgroundTransitions={[{ start: 19.5, end: 20.2, color: BG_DARK }]}
      loop={false}
      persistKey="tour-inbox-workflow"
      onCanvasClick={(_, toggle) => toggle()}
      i18nDict={inboxWorkflowI18n}
    >
      <Soundtrack src={soundtrackUrl} startOffset={1} />

      <SceneHook
        start={0}
        end={2.5}
        caption={t('AI that reports back to you.')}
      />
      <SceneInboxFull start={2.4} end={10} />
      <SceneTranscript start={9.9} end={16} />
      <SceneTagsSearch start={15.9} end={20} />
      <SceneCTA
        start={19.9}
        end={26}
        tagline={t('Now you can.')}
        ctaLabel={t('Open devs.new →')}
        frictionBadge={t('No signup · No install · Free')}
      />
    </Stage>
  )
}
