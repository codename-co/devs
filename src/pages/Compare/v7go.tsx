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

const ALT_NAME = 'V7 Go'

export const CompareV7GoPage = () => {
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
            alt: t('Cloud-based'),
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
            alt: t('Document processing'),
          },
        ]}
        altName={ALT_NAME}
      />

      <FeatureTable
        features={[
          [t('Open Source'), t('MIT License'), t('No'), 'yes', 'no'],
          [
            t('Browser-Native'),
            t('Yes'),
            t('Web app (cloud)'),
            'yes',
            'partial',
          ],
          [t('Data Stays Local'), t('Yes'), t('No'), 'yes', 'no'],
          [t('Multi-Agent Orchestration'), t('Advanced'), t('No'), 'yes', 'no'],
          [t('Bring Your Own Keys'), t('Yes'), t('No'), 'yes', 'no'],
          [t('Offline Capable'), t('Yes'), t('No'), 'yes', 'no'],
          [
            t('LLM Provider Choice'),
            t('6+ providers'),
            t('Platform-selected'),
            'yes',
            'no',
          ],
          [t('P2P Sync'), t('Yes'), t('No'), 'yes', 'no'],
          [
            t('General-Purpose AI'),
            t('Yes'),
            t('Document processing only'),
            'yes',
            'no',
          ],
          [t('Free Tier'), t('Unlimited'), t('No free tier'), 'yes', 'no'],
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
              'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} processes all documents on their cloud infrastructure.',
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Wallet',
            title: t('Zero Platform Cost'),
            desc: t(
              'Pay only for your own LLM API usage. No enterprise contracts, no per-page pricing, no sales calls required.',
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Group',
            title: t('Beyond Document Processing'),
            desc: t(
              'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is focused on document understanding and data extraction.',
            ),
            gradient: 'from-blue-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Shuffle',
            title: t('Provider Freedom'),
            desc: t(
              'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} uses their own platform-selected models with no choice.',
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
            { text: t('No free tier available'), included: false },
            { text: t('Enterprise-only pricing'), included: false },
            { text: t('Cloud-only document processing'), included: false },
            {
              text: t('No bring-your-own-key support'),
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
              'Need specialized document understanding and data extraction at enterprise scale',
            ),
            t(
              'Want automated workflows for processing PDFs, images, and structured documents',
            ),
            t(
              'Require enterprise integrations and dedicated support for document automation',
            ),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
