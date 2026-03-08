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

const ALT_NAME = 'Manus'

export const CompareManusPage = () => {
  const { t } = useI18n(localeI18n)

  return (
    <Layout showBackButton={false}>
      <ComparisonHero
        title={t('{productName} vs {alternative}', {
          productName: PRODUCT.displayName,
          alternative: ALT_NAME,
        })}
        subtitle={t(
          'Full AI agent orchestration that runs in your browser — no cloud, no credits, no limits.',
        )}
      />

      <TLDRCards
        items={[
          {
            icon: 'Lock',
            title: t('Privacy'),
            devs: t('100% client-side'),
            alt: t('Cloud (Meta infra)'),
          },
          {
            icon: 'Wallet',
            title: t('Pricing'),
            devs: t('Free forever'),
            alt: t('From $39/mo'),
          },
          {
            icon: 'Group',
            title: t('Orchestration'),
            devs: t('Multi-agent teams'),
            alt: t('Single agent'),
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
          [t('P2P Sync'), t('Yes'), t('No'), 'yes', 'no'],
          [t('Agent Memory'), t('Yes'), t('Projects only'), 'yes', 'partial'],
          [
            t('LLM Provider Choice'),
            t('6+ providers'),
            t('Locked to {alternative}', { alternative: ALT_NAME }),
            'yes',
            'no',
          ],
          [
            t('Free Tier'),
            t('Unlimited'),
            t('4,000 credits/mo'),
            'yes',
            'partial',
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
              'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Manus processes everything on Meta\u2019s cloud infrastructure.',
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Wallet',
            title: t('Zero Platform Cost'),
            desc: t(
              'Pay only for your own LLM API usage. No $39/month subscription, no credit limits, no surprise bills.',
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Group',
            title: t('Multi-Agent Teams'),
            desc: t(
              'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} runs a single agent per task.',
            ),
            gradient: 'from-blue-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Shuffle',
            title: t('Provider Freedom'),
            desc: t(
              'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their own infrastructure.',
            ),
            gradient: 'from-purple-500/10 via-transparent to-transparent',
          },
        ]}
      />

      <PricingComparison
        altTier={{
          name: ALT_NAME,
          price: t('From $39/mo'),
          features: [
            { text: t('Credit-based usage'), included: false },
            { text: t('Paid tiers for more'), included: false },
            { text: t('Cloud-only processing'), included: false },
            {
              text: t('Locked to {alternative} infra', {
                alternative: ALT_NAME,
              }),
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
            t('Want a polished, zero-config SaaS experience out of the box'),
            t('Prefer not to manage your own LLM API keys'),
            t('Need built-in Slack integration and scheduled tasks'),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
