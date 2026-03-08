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

const ALT_NAME = 'ROMA'

export const CompareRomaPage = () => {
  const { t } = useI18n(localeI18n)

  return (
    <Layout showBackButton={false}>
      <ComparisonHero
        title={t('{productName} vs {alternative}', {
          productName: PRODUCT.displayName,
          alternative: ALT_NAME,
        })}
        subtitle={t(
          'Full AI agent orchestration that runs in your browser \u2014 no Python, no Docker, no setup.',
        )}
      />

      <TLDRCards
        items={[
          {
            icon: 'WindowCheck',
            title: t('Setup'),
            devs: t('Zero install (browser)'),
            alt: t('Python + Docker setup'),
          },
          {
            icon: 'ViewStructureUp',
            title: t('UX'),
            devs: t('Visual UI'),
            alt: t('Code-first / API-first'),
          },
          {
            icon: 'Globe',
            title: t('Architecture'),
            devs: t('Browser-native PWA'),
            alt: t('Python + DSPy framework'),
          },
        ]}
        altName={ALT_NAME}
      />

      <FeatureTable
        features={[
          [t('Open Source'), t('MIT License'), t('Apache 2.0'), 'yes', 'yes'],
          [
            t('Browser-Native'),
            t('Yes'),
            t('No (Python + Docker)'),
            'yes',
            'no',
          ],
          [
            t('Data Stays Local'),
            t('Yes'),
            t('Yes (self-hosted)'),
            'yes',
            'yes',
          ],
          [
            t('Multi-Agent Orchestration'),
            t('Advanced'),
            t('Recursive pipeline'),
            'yes',
            'yes',
          ],
          [t('Bring Your Own Keys'), t('Yes'), t('Yes'), 'yes', 'yes'],
          [t('Offline Capable'), t('Yes'), t('No (needs API)'), 'yes', 'no'],
          [t('P2P Sync'), t('Yes'), t('No'), 'yes', 'no'],
          [t('Agent Memory'), t('Yes'), t('No'), 'yes', 'no'],
          [
            t('LLM Provider Choice'),
            t('6+ providers'),
            t('OpenRouter + major providers'),
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
            icon: 'WindowCheck',
            title: t('Zero Setup'),
            desc: t(
              'No Python, no Docker, no DSPy \u2014 just open your browser. {alternative} requires a full Python environment with Docker.',
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'ViewStructureUp',
            title: t('Visual Experience'),
            desc: t(
              'Full graphical UI with agent visualization and real-time workflow tracking. {alternative} is a code-first framework with a REST API.',
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Brain',
            title: t('Agent Memory & Knowledge'),
            desc: t(
              'Persistent memory system and knowledge base with human review. {alternative} focuses on execution pipelines without built-in memory.',
            ),
            gradient: 'from-blue-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Globe',
            title: t('Browser-Native'),
            desc: t(
              'Works on any device including mobile \u2014 no install, no server infrastructure. Everything runs client-side as a PWA.',
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
            { text: t('Requires Python + Docker'), included: false },
            { text: t('No visual UI \u2014 code-first only'), included: false },
            { text: t('Server infrastructure needed'), included: false },
            { text: t('No built-in knowledge base'), included: false },
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
              'Need recursive task decomposition with DSPy-based prediction strategies',
            ),
            t(
              'Want a programmable pipeline with Atomizer, Planner, Executor, and Verifier stages',
            ),
            t('Prefer MLflow observability and E2B sandboxed code execution'),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
