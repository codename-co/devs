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

const ALT_NAME = 'OpenManus'

export const CompareOpenManusPage = () => {
  const { t } = useI18n(localeI18n)

  return (
    <Layout showBackButton={false}>
      <ComparisonHero
        title={t('{productName} vs {alternative}', {
          productName: PRODUCT.displayName,
          alternative: ALT_NAME,
        })}
        subtitle={t(
          'Full AI agent orchestration that runs in your browser \u2014 no Python, no server, no setup.',
        )}
      />

      <TLDRCards
        items={[
          {
            icon: 'WindowCheck',
            title: t('Setup'),
            devs: t('Zero install (browser)'),
            alt: t('Python environment'),
          },
          {
            icon: 'ViewStructureUp',
            title: t('Architecture'),
            devs: t('Browser-native PWA'),
            alt: t('Python framework'),
          },
          {
            icon: 'User',
            title: t('UX'),
            devs: t('Visual UI'),
            alt: t('Command-line / code-first'),
          },
        ]}
        altName={ALT_NAME}
      />

      <FeatureTable
        features={[
          [t('Open Source'), t('MIT License'), t('MIT License'), 'yes', 'yes'],
          [t('Browser-Native'), t('Yes'), t('No (Python)'), 'yes', 'no'],
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
            t('Basic flows'),
            'yes',
            'partial',
          ],
          [t('Bring Your Own Keys'), t('Yes'), t('Yes'), 'yes', 'yes'],
          [t('Offline Capable'), t('Yes'), t('No (needs API)'), 'yes', 'no'],
          [t('P2P Sync'), t('Yes'), t('No'), 'yes', 'no'],
          [t('Agent Memory'), t('Yes'), t('No'), 'yes', 'no'],
          [
            t('LLM Provider Choice'),
            t('6+ providers'),
            t('OpenAI-compatible'),
            'yes',
            'partial',
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
              'No Python, no dependencies, no virtual environments \u2014 just open a browser and start orchestrating agents instantly.',
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'ViewStructureUp',
            title: t('Visual Experience'),
            desc: t(
              'Full graphical UI with agent visualization, real-time workflow tracking, and drag-and-drop. {alternative} is a code-first, command-line tool.',
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Brain',
            title: t('Agent Memory & Learning'),
            desc: t(
              'Agents remember context across conversations with a persistent memory system and human review. {alternative} has no built-in memory layer.',
            ),
            gradient: 'from-blue-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Globe',
            title: t('Browser-Native'),
            desc: t(
              'Works on any device including mobile \u2014 no install, no server, no Python runtime. Everything runs client-side as a PWA.',
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
            { text: t('Requires Python environment'), included: false },
            { text: t('No managed hosting'), included: false },
            { text: t('Setup & maintenance required'), included: false },
            { text: t('CLI-first interface'), included: false },
          ],
        }}
      />

      <HonestTake
        warningSide={{
          title: t('Consider {alternative} if you\u2026', {
            alternative: ALT_NAME,
          }),
          items: [
            t('Need Python-based extensibility and custom agent code'),
            t('Prefer a code-first approach over visual UI'),
            t('Want A2A protocol support'),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
