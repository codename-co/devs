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

const ALT_NAME = 'HappyCapy'

export const CompareHappyCapyPage = () => {
  const { t } = useI18n(localeI18n)

  return (
    <Layout showBackButton={false}>
      <ComparisonHero
        title={t('{productName} vs {alternative}', {
          productName: PRODUCT.displayName,
          alternative: ALT_NAME,
        })}
        subtitle={t(
          'Full AI agent orchestration that runs in your browser \u2014 no cloud sandbox, no credits, no limits.',
        )}
      />

      <TLDRCards
        items={[
          {
            icon: 'Lock',
            title: t('Privacy'),
            devs: t('100% client-side'),
            alt: t('Cloud sandbox'),
          },
          {
            icon: 'Wallet',
            title: t('Pricing'),
            devs: t('Free forever'),
            alt: t('From ${price}/mo', { price: 17 }),
          },
          {
            icon: 'Code',
            title: t('Open Source'),
            devs: t('MIT License'),
            alt: t('Closed source'),
          },
        ]}
        altName={ALT_NAME}
      />

      <FeatureTable
        features={[
          [t('Open Source'), t('MIT License'), t('No'), 'yes', 'no'],
          [t('Browser-Native'), t('Yes'), t('Cloud sandbox'), 'yes', 'partial'],
          [t('Data Stays Local'), t('Yes'), t('No (cloud infra)'), 'yes', 'no'],
          [
            t('Multi-Agent Orchestration'),
            t('Advanced'),
            t('Agent teams (preview)'),
            'yes',
            'partial',
          ],
          [t('Bring Your Own Keys'), t('Yes'), t('No'), 'yes', 'no'],
          [t('Offline Capable'), t('Yes'), t('No'), 'yes', 'no'],
          [t('P2P Sync'), t('Yes'), t('No'), 'yes', 'no'],
          [t('Agent Memory'), t('Yes'), t('Via skills'), 'yes', 'partial'],
          [
            t('LLM Provider Choice'),
            t('6+ providers'),
            t('{alternative} models', { alternative: ALT_NAME }),
            'yes',
            'no',
          ],
          [
            t('Free Tier'),
            t('Unlimited'),
            t('Limited credits'),
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
              'All processing stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. {alternative} runs everything on a cloud sandbox.',
              { alternative: ALT_NAME },
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Wallet',
            title: t('Zero Platform Cost'),
            desc: t(
              'No subscription, no credits. {alternative} starts at $17/mo and goes up to $200/mo for full features.',
              { alternative: ALT_NAME },
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Code',
            title: t('Open Source'),
            desc: t(
              'Full MIT-licensed codebase \u2014 inspect, modify, self-host. {alternative} is closed source.',
              { alternative: ALT_NAME },
            ),
            gradient: 'from-blue-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Shuffle',
            title: t('Provider Freedom'),
            desc: t(
              'Use any LLM provider \u2014 OpenAI, Anthropic, Gemini, Ollama, Mistral and more. {alternative} locks you into their model access.',
              { alternative: ALT_NAME },
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
            { text: t('Credit-based usage'), included: false },
            { text: t('Cloud sandbox'), included: false },
            { text: t('Closed-source platform'), included: false },
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
            t('Want a managed cloud sandbox environment'),
            t('Need built-in email integration and scheduling'),
            t('Prefer access to 150+ models without managing API keys'),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
