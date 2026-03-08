import { PRODUCT } from '@/config/product'
import { useI18n } from '@/i18n'
import Layout from '@/layouts/Default'
import {
  ComparisonHero,
  TLDRCards,
  FeatureTable,
  AdvantagesGrid,
  PricingComparison,
  HonestTake,
  FinalCTA,
} from './components'
import localeI18n from './i18n'

const ALT_NAME = 'AgenticSeek'

export const CompareAgenticSeekPage = () => {
  const { t } = useI18n(localeI18n)

  return (
    <Layout showBackButton={false}>
      <ComparisonHero
        title={t('{productName} vs {alternative}', {
          productName: PRODUCT.displayName,
          alternative: ALT_NAME,
        })}
        subtitle={t(
          'Full AI agent orchestration that runs in your browser \u2014 no Docker, no Python, no setup.',
        )}
      />

      <TLDRCards
        items={[
          {
            icon: 'WindowCheck',
            title: t('Setup'),
            devs: t('Zero install (browser)'),
            alt: t('Docker + Python setup'),
          },
          {
            icon: 'Group',
            title: t('Orchestration'),
            devs: t('Multi-agent teams'),
            alt: t('Single agent routing'),
          },
          {
            icon: 'Globe',
            title: t('Architecture'),
            devs: t('Browser-native PWA'),
            alt: t('Desktop (Python + Docker)'),
          },
        ]}
        altName={ALT_NAME}
      />

      <FeatureTable
        features={[
          [t('Open Source'), t('MIT License'), t('GPL-3.0'), 'yes', 'yes'],
          [
            t('Browser-Native'),
            t('Yes'),
            t('No (Python + Docker)'),
            'yes',
            'no',
          ],
          [t('Data Stays Local'), t('Yes'), t('Yes'), 'yes', 'yes'],
          [
            t('Multi-Agent Orchestration'),
            t('Advanced'),
            t('Smart routing'),
            'yes',
            'partial',
          ],
          [t('Bring Your Own Keys'), t('Yes'), t('Yes'), 'yes', 'yes'],
          [t('Offline Capable'), t('Yes'), t('Yes (local LLM)'), 'yes', 'yes'],
          [t('P2P Sync'), t('Yes'), t('No'), 'yes', 'no'],
          [
            t('Agent Memory'),
            t('Yes'),
            t('Session recovery'),
            'yes',
            'partial',
          ],
          [
            t('LLM Provider Choice'),
            t('6+ providers'),
            t('8+ providers'),
            'yes',
            'yes',
          ],
          [t('Free Tier'), t('Unlimited'), t('Unlimited'), 'yes', 'yes'],
        ]}
        altName={ALT_NAME}
      />

      <AdvantagesGrid
        chipLabel={t('Why {productName}', { productName: PRODUCT.displayName })}
        title={t('Why Teams Choose {productName} over {alternative}', {
          productName: PRODUCT.displayName,
          alternative: ALT_NAME,
        })}
        advantages={[
          {
            icon: 'Flash',
            title: t('Zero Setup'),
            desc: t(
              'No Python, no Docker, no SearxNG \u2014 just open your browser. {alternative} requires a full Docker + Python environment.',
              { alternative: ALT_NAME },
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Group',
            title: t('Multi-Agent Teams'),
            desc: t(
              'Full team orchestration with dependency resolution and parallel execution. {alternative} uses smart routing to a single agent.',
              { alternative: ALT_NAME },
            ),
            gradient: 'from-blue-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Globe',
            title: t('Browser-Native'),
            desc: t(
              'Works on any device including mobile. {alternative} is desktop-only with Python + Docker.',
              { alternative: ALT_NAME },
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
          {
            icon: 'CloudSync',
            title: t('P2P Collaboration'),
            desc: t(
              'Cross-device sync via Yjs/WebRTC. {alternative} has no collaboration features.',
              { alternative: ALT_NAME },
            ),
            gradient: 'from-purple-500/10 via-transparent to-transparent',
          },
        ]}
      />

      <PricingComparison
        altTier={{
          name: ALT_NAME,
          price: t('Free (self-hosted)'),
          features: [
            { text: t('Requires Docker + Python'), included: false },
            { text: t('SearxNG setup needed'), included: false },
            { text: t('Desktop only \u2014 no mobile'), included: false },
            { text: t('GPL-3.0 license (restrictive)'), included: false },
          ],
        }}
      />

      <HonestTake
        warningSide={{
          title: t('Consider {alternative} if you\u2026', {
            alternative: ALT_NAME,
          }),
          items: [
            t('Need autonomous web browsing with stealth capabilities'),
            t(
              'Want local code execution in multiple languages (Python, C, Go, Java)',
            ),
            t('Prefer voice-enabled interaction with speech-to-text'),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
