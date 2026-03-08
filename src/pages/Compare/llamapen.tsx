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

const ALT_NAME = 'LlamaPen'

export const CompareLlamaPenPage = () => {
  const { t } = useI18n(localeI18n)

  return (
    <Layout showBackButton={false}>
      <ComparisonHero
        title={t('{productName} vs {alternative}', {
          productName: PRODUCT.displayName,
          alternative: ALT_NAME,
        })}
        subtitle={t(
          'Full AI agent orchestration that runs in your browser \u2014 no download, no Ollama dependency, no limits.',
        )}
      />

      <TLDRCards
        items={[
          {
            icon: 'Globe',
            title: t('Setup'),
            devs: t('Zero install (browser)'),
            alt: t('Browser UI for Ollama'),
          },
          {
            icon: 'Group',
            title: t('Orchestration'),
            devs: t('Multi-agent teams'),
            alt: t('Single chat interface'),
          },
          {
            icon: 'SparksSolid',
            title: t('Provider Support'),
            devs: t('6+ providers (cloud + local)'),
            alt: t('Ollama only'),
          },
        ]}
        altName={ALT_NAME}
      />

      <FeatureTable
        features={[
          [t('Open Source'), t('MIT License'), t('Yes'), 'yes', 'yes'],
          [
            t('Browser-Native'),
            t('Yes'),
            t('Yes (Ollama web UI)'),
            'yes',
            'yes',
          ],
          [t('Data Stays Local'), t('Yes'), t('Yes'), 'yes', 'yes'],
          [
            t('Multi-Agent Orchestration'),
            t('Advanced'),
            t('No (single chat)'),
            'yes',
            'no',
          ],
          [
            t('LLM Provider Choice'),
            t('6+ providers'),
            t('Ollama only'),
            'yes',
            'partial',
          ],
          [
            t('Offline Capable'),
            t('Yes (PWA)'),
            t('Requires Ollama running'),
            'yes',
            'partial',
          ],
          [t('Agent Memory'), t('Yes'), t('No'), 'yes', 'no'],
          [t('Knowledge Base'), t('Yes'), t('No'), 'yes', 'no'],
          [t('P2P Sync'), t('Yes'), t('No'), 'yes', 'no'],
          [t('Marketplace & Connectors'), t('Yes'), t('No'), 'yes', 'no'],
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
            icon: 'SparksSolid',
            title: t('Multi-Provider Freedom'),
            desc: t(
              'Connect to OpenAI, Anthropic, Gemini, Ollama, and more. {alternative} only works with a local Ollama instance.',
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Group',
            title: t('Multi-Agent Orchestration'),
            desc: t(
              'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} is a single-chat interface.',
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Brain',
            title: t('Agent Memory & Knowledge Base'),
            desc: t(
              'Persistent memory with human review, plus a full knowledge base for document ingestion. {alternative} has neither.',
            ),
            gradient: 'from-blue-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Shuffle',
            title: t('P2P Sync & Ecosystem'),
            desc: t(
              'Cross-device sync via Yjs/WebRTC, marketplace, connectors, and traces. {alternative} offers none of these.',
            ),
            gradient: 'from-purple-500/10 via-transparent to-transparent',
          },
        ]}
      />

      <PricingComparison
        altTier={{
          name: ALT_NAME,
          price: t('Free'),
          features: [
            { text: t('Ollama-only (no cloud providers)'), included: false },
            { text: t('No multi-agent orchestration'), included: false },
            { text: t('No agent memory or knowledge base'), included: false },
            { text: t('No P2P sync or marketplace'), included: false },
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
              'Only use local Ollama models and want the simplest possible chat UI',
            ),
            t('Don\u2019t need multi-agent orchestration or agent memory'),
            t(
              'Want a lightweight, zero-config interface exclusively for Ollama',
            ),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
