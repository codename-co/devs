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
import { useI18n } from '@/i18n'
import { Stage, Soundtrack } from '../player'
import { SceneHook, ScenePromise, SceneCTA } from '../scenes'
import { SceneBrowserLocal, SceneBYOK } from './scenes'
import privacyFirstI18n from './i18n'
import soundtrackUrl from '../assets/starostin-promo-promotional-showreel-music-478259.mp3'

const BG_LIGHT = '#f8f9fb'
const BG_DARK = 'oklch(12% 0.0015 253.83)'

export function PrivacyFirstVideo() {
  const { t } = useI18n(privacyFirstI18n)

  return (
    <Stage
      duration={28}
      background={BG_LIGHT}
      backgroundTransitions={[{ start: 14.5, end: 15.2, color: BG_DARK }]}
      loop={false}
      persistKey="tour-privacy-first"
      onCanvasClick={(_, toggle) => toggle()}
      i18nDict={privacyFirstI18n}
    >
      <Soundtrack src={soundtrackUrl} startOffset={1} />

      <SceneHook
        start={0}
        end={2.5}
        caption={t('What leaves your browser? Nothing.')}
      />
      <SceneBrowserLocal start={2.4} end={9} />
      <SceneBYOK start={8.9} end={15} />
      <ScenePromise
        start={14.9}
        end={22}
        phrases={[
          { text: t('No server.'), at: 0.4 },
          { text: t('No subscription.'), at: 1.6 },
          { text: t('No third party.'), at: 2.8 },
          { text: t('Open source.'), at: 4.0 },
        ]}
        tagline={t('OPEN SOURCE · BROWSER-NATIVE · YOURS')}
      />
      <SceneCTA
        start={21.9}
        end={28}
        tagline={t('Now you can.')}
        ctaLabel={t('Open devs.new →')}
        frictionBadge={t('No signup · No install · Free')}
      />
    </Stage>
  )
}
