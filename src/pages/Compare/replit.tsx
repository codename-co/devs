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

const ALT_NAME = 'Replit Agent'

export const CompareReplitPage = () => {
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
            alt: t('Cloud (Replit infra)'),
          },
          {
            icon: 'Wallet',
            title: t('Pricing'),
            devs: t('Free forever'),
            alt: t('From ${price}/mo', { price: 17 }),
          },
          {
            icon: 'Group',
            title: t('Orchestration'),
            devs: t('Multi-agent teams'),
            alt: t('Single agent (app builder)'),
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
          [t('Agent Memory'), t('Yes'), t('No'), 'yes', 'no'],
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
            t('Limited daily credits'),
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
              'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Replit Agent processes everything on their cloud infrastructure.',
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Wallet',
            title: t('Zero Platform Cost'),
            desc: t(
              'Pay only for your own LLM API usage. No $17\u2013$100/month subscription, no credit limits, no surprise bills.',
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Group',
            title: t('Multi-Agent Teams'),
            desc: t(
              'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-agent app building.',
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
          price: t('From ${price}/mo', { price: 17 }),
          features: [
            { text: t('Credit-based usage ($20\u2013$100)'), included: false },
            { text: t('Paid tiers for more builds'), included: false },
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
            t('Need one-click deployment and built-in hosting for apps'),
            t('Want an all-in-one IDE with instant infrastructure setup'),
            t('Prefer a managed platform for full-stack app generation'),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
