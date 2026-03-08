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

const ALT_NAME = 'Trace'

export const CompareTracePage = () => {
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
            alt: t('Not listed (beta)'),
          },
          {
            icon: 'Code',
            title: t('Open Source'),
            devs: t('MIT License'),
            alt: t('Closed-source'),
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
          [
            t('Multi-Agent Orchestration'),
            t('Advanced'),
            t('Workflow-based'),
            'yes',
            'partial',
          ],
          [t('Bring Your Own Keys'), t('Yes'), t('Unknown'), 'yes', 'no'],
          [t('Offline Capable'), t('Yes'), t('No'), 'yes', 'no'],
          [t('P2P Sync'), t('Yes'), t('No'), 'yes', 'no'],
          [
            t('LLM Provider Choice'),
            t('6+ providers'),
            t('Unknown'),
            'yes',
            'no',
          ],
          [
            t('Availability'),
            t('Available now'),
            t('Beta / waitlist'),
            'yes',
            'no',
          ],
          [
            t('Free Tier'),
            t('Unlimited'),
            t('Not publicly listed'),
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
            icon: 'Lock',
            title: t('True Privacy'),
            desc: t(
              'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. Trace processes everything on their cloud infrastructure.',
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Wallet',
            title: t('Available & Free'),
            desc: t(
              'Use {productName} today at no cost \u2014 no waitlist, no beta access required. Trace is still in closed beta with undisclosed pricing.',
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Code',
            title: t('Open Source & Transparent'),
            desc: t(
              'Fully open-source under MIT license \u2014 inspect, modify, and self-host. Trace is closed-source with no public codebase.',
            ),
            gradient: 'from-blue-500/10 via-transparent to-transparent',
          },
          {
            icon: 'WifiOff',
            title: t('Works Offline'),
            desc: t(
              'Run entirely in your browser without internet after initial load. Trace\u2019s cloud-based architecture requires a constant connection.',
            ),
            gradient: 'from-purple-500/10 via-transparent to-transparent',
          },
        ]}
      />

      <PricingComparison
        altTier={{
          name: ALT_NAME,
          price: t('Not listed (beta)'),
          features: [
            { text: t('Closed beta / waitlist only'), included: false },
            { text: t('Pricing not publicly available'), included: false },
            { text: t('Cloud-only processing'), included: false },
            { text: t('BYOK status unknown'), included: false },
          ],
        }}
      />

      <HonestTake
        warningSide={{
          title: t('Consider {alternative} if you\u2026', {
            alternative: ALT_NAME,
          }),
          items: [
            t('Need a knowledge-graph context engine for enterprise workflows'),
            t('Want built-in SLA monitoring and department-level coordination'),
            t(
              'Require deep Slack, Notion, Jira, and Google Drive integrations out of the box',
            ),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
