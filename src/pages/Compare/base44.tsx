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

const ALT_NAME = 'Base44'

export const CompareBase44Page = () => {
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
            alt: t('From ${price}/mo', { price: 20 }),
          },
          {
            icon: 'Group',
            title: t('Orchestration'),
            devs: t('Multi-agent teams'),
            alt: t('App generation'),
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
            t('App building only'),
            'yes',
            'no',
          ],
          [
            t('Free Tier'),
            t('Unlimited'),
            t('Limited free tier'),
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
              'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} processes everything on their cloud infrastructure.',
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Wallet',
            title: t('Zero Platform Cost'),
            desc: t(
              'Pay only for your own LLM API usage. No ${price}/month subscription, no feature gates, no surprise bills.',
              { price: 20 },
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Group',
            title: t('Beyond App Building'),
            desc: t(
              'Coordinate specialized agent teams for any task \u2014 research, writing, analysis, development. {alternative} is limited to generating apps.',
            ),
            gradient: 'from-blue-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Shuffle',
            title: t('Provider Freedom'),
            desc: t(
              'Switch between OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} selects AI models for you with no choice.',
            ),
            gradient: 'from-purple-500/10 via-transparent to-transparent',
          },
        ]}
      />

      <PricingComparison
        altTier={{
          name: ALT_NAME,
          price: t('From ${price}/mo', { price: 20 }),
          features: [
            { text: t('Limited free tier'), included: false },
            { text: t('Paid plans for more features'), included: false },
            { text: t('Cloud-only processing'), included: false },
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
            t('Want to generate full-stack apps from natural language prompts'),
            t('Prefer built-in hosting, auth, and database without setup'),
            t('Need one-click publish with custom domains and analytics'),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
