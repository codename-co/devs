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

const ALT_NAME = 'Runner H'

export const CompareRunnerHPage = () => {
  const { t } = useI18n(localeI18n)

  return (
    <Layout showBackButton={false}>
      <ComparisonHero
        title={t('{productName} vs {alternative}', {
          productName: PRODUCT.displayName,
          alternative: ALT_NAME,
        })}
        subtitle={t(
          'Full AI agent orchestration that runs in your browser \u2014 no cloud, no credits, no limits.',
        )}
      />

      <TLDRCards
        items={[
          {
            icon: 'Lock',
            title: t('Privacy'),
            devs: t('100% client-side'),
            alt: t('Cloud-based processing'),
          },
          {
            icon: 'Wallet',
            title: t('Pricing'),
            devs: t('Free forever'),
            alt: t('Enterprise (contact sales)'),
          },
          {
            icon: 'Group',
            title: t('Orchestration'),
            devs: t('Multi-agent teams'),
            alt: t('Computer-use agent'),
          },
        ]}
        altName={ALT_NAME}
      />

      <FeatureTable
        features={[
          [
            t('Open Source'),
            t('MIT License'),
            t('Partially'),
            'yes',
            'partial',
          ],
          [t('Browser-Native'), t('Yes'), t('Cloud API/demo'), 'yes', 'no'],
          [t('Data Stays Local'), t('Yes'), t('No'), 'yes', 'no'],
          [
            t('Multi-Agent Orchestration'),
            t('Advanced'),
            t('Sub-agent architecture'),
            'yes',
            'partial',
          ],
          [t('Bring Your Own Keys'), t('Yes'), t('No'), 'yes', 'no'],
          [t('Offline Capable'), t('Yes'), t('No'), 'yes', 'no'],
          [t('P2P Sync'), t('Yes'), t('No'), 'yes', 'no'],
          [
            t('LLM Provider Choice'),
            t('6+ providers'),
            t('Proprietary Holo models'),
            'yes',
            'no',
          ],
          [
            t('Cross-Platform Automation'),
            t('Browser-based'),
            t('Desktop, web & mobile'),
            'partial',
            'yes',
          ],
          [
            t('Free Tier'),
            t('Unlimited'),
            t('None (enterprise only)'),
            'yes',
            'no',
          ],
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
            icon: 'Lock',
            title: t('True Privacy'),
            desc: t(
              'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Runner H processes everything on H Company\u2019s cloud infrastructure.',
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Wallet',
            title: t('Zero Platform Cost'),
            desc: t(
              'Pay only for your own LLM API usage. Runner H runs are \u201cextremely costly\u201d and require enterprise contracts.',
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Group',
            title: t('Multi-Agent Teams'),
            desc: t(
              'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-task computer-use automation.',
            ),
            gradient: 'from-blue-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Shuffle',
            title: t('Provider Freedom'),
            desc: t(
              'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into proprietary Holo models.',
            ),
            gradient: 'from-purple-500/10 via-transparent to-transparent',
          },
        ]}
      />

      <PricingComparison
        altTier={{
          name: ALT_NAME,
          price: t('Enterprise (contact sales)'),
          features: [
            { text: t('Extremely costly per run'), included: false },
            { text: t('No self-serve pricing'), included: false },
            { text: t('Cloud-only processing'), included: false },
            {
              text: t('Locked to proprietary models'),
              included: false,
            },
          ],
        }}
      />

      <HonestTake
        warningSide={{
          title: t('Consider {alternative} if you\u2026', {
            alternative: ALT_NAME,
          }),
          items: [
            t(
              'Need SOTA computer-use automation across desktop, web, and mobile',
            ),
            t('Require cross-platform GUI interaction with visual grounding'),
            t(
              'Have an enterprise budget and need benchmark-leading task completion',
            ),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
