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

const ALT_NAME = 'DataKit'

export const CompareDataKitPage = () => {
  const { t } = useI18n(localeI18n)

  return (
    <Layout showBackButton={false}>
      <ComparisonHero
        title={t('{productName} vs {alternative}', {
          productName: PRODUCT.displayName,
          alternative: ALT_NAME,
        })}
        subtitle={t(
          'Full AI agent orchestration that runs in your browser \u2014 not just data analysis, but any task.',
        )}
      />

      <TLDRCards
        items={[
          {
            icon: 'Group',
            title: t('Scope'),
            devs: t('Multi-agent platform'),
            alt: t('Data analysis tool'),
          },
          {
            icon: 'Shuffle',
            title: t('LLM Providers'),
            devs: t('6+ providers'),
            alt: t('Data-focused AI'),
          },
          {
            icon: 'CloudSync',
            title: t('Collaboration'),
            devs: t('P2P sync & teams'),
            alt: t('Single-user'),
          },
        ]}
        altName={ALT_NAME}
      />

      <FeatureTable
        features={[
          [t('Open Source'), t('MIT License'), t('Yes'), 'yes', 'yes'],
          [t('Browser-Native'), t('Yes'), t('Yes'), 'yes', 'yes'],
          [t('Data Stays Local'), t('Yes'), t('Yes'), 'yes', 'yes'],
          [t('Multi-Agent Orchestration'), t('Advanced'), t('No'), 'yes', 'no'],
          [t('Bring Your Own Keys'), t('Yes'), t('Likely'), 'yes', 'yes'],
          [t('Offline Capable'), t('Yes'), t('Yes'), 'yes', 'yes'],
          [
            t('LLM Provider Choice'),
            t('6+ providers'),
            t('Limited'),
            'yes',
            'partial',
          ],
          [t('P2P Sync'), t('Yes'), t('No'), 'yes', 'no'],
          [t('Agent Memory'), t('Yes'), t('No'), 'yes', 'no'],
          [
            t('General-Purpose AI'),
            t('Yes'),
            t('Data analysis only'),
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
            icon: 'Group',
            title: t('Multi-Agent Teams'),
            desc: t(
              'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is focused solely on data file analysis.',
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Brain',
            title: t('Agent Memory & Knowledge'),
            desc: t(
              'Agents learn from conversations and access a full knowledge base. {alternative} has no memory or knowledge management.',
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Shuffle',
            title: t('Provider Freedom'),
            desc: t(
              'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} is limited to data-specific AI capabilities.',
            ),
            gradient: 'from-blue-500/10 via-transparent to-transparent',
          },
          {
            icon: 'CloudSync',
            title: t('P2P Collaboration'),
            desc: t(
              'Cross-device sync via Yjs/WebRTC for seamless teamwork. {alternative} is a single-user data analysis tool.',
            ),
            gradient: 'from-purple-500/10 via-transparent to-transparent',
          },
        ]}
      />

      <PricingComparison
        altTier={{
          name: ALT_NAME,
          price: t('Free (open source)'),
          features: [
            {
              text: t('Data analysis only \u2014 no orchestration'),
              included: false,
            },
            { text: t('No multi-agent collaboration'), included: false },
            { text: t('No agent memory or knowledge base'), included: false },
            { text: t('No P2P sync or cross-device support'), included: false },
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
              'Need dedicated CSV, JSON, XLS, or Parquet file analysis with AI assistance',
            ),
            t(
              'Want a lightweight, focused tool specifically for local data exploration',
            ),
            t(
              'Prefer a single-purpose data tool over a full orchestration platform',
            ),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
