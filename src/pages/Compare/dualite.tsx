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

const ALT_NAME = 'Dualite'

export const CompareDualitePage = () => {
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
            alt: t('From $29/mo'),
          },
          {
            icon: 'Group',
            title: t('Orchestration'),
            devs: t('Multi-agent teams'),
            alt: t('App/web builder'),
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
          [
            t('LLM Provider Choice'),
            t('6+ providers'),
            t('Locked to {alternative}', { alternative: ALT_NAME }),
            'yes',
            'no',
          ],
          [t('Free Tier'), t('Unlimited'), t('5 messages'), 'yes', 'partial'],
          [t('Figma-to-Code'), t('No'), t('Yes'), 'no', 'yes'],
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
              'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Dualite processes everything on their cloud servers.',
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Wallet',
            title: t('Zero Platform Cost'),
            desc: t(
              'Pay only for your own LLM API usage. No $29\u2013$79/month subscription, no message limits, no surprise bills.',
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Group',
            title: t('Multi-Agent Teams'),
            desc: t(
              'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} focuses on single-prompt app generation.',
            ),
            gradient: 'from-blue-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Shuffle',
            title: t('Provider Freedom'),
            desc: t(
              'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their own models.',
            ),
            gradient: 'from-purple-500/10 via-transparent to-transparent',
          },
        ]}
      />

      <PricingComparison
        altTier={{
          name: ALT_NAME,
          price: t('From $29/mo'),
          features: [
            { text: t('Message-based limits'), included: false },
            { text: t('5 free messages only'), included: false },
            { text: t('Cloud-only processing'), included: false },
            {
              text: t('Locked to {alternative} models', {
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
            t('Need Figma-to-code conversion and app templates out of the box'),
            t(
              'Want a visual app builder with authentication and backend included',
            ),
            t('Prefer prompt-to-app generation over multi-agent orchestration'),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
