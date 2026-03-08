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

const ALT_NAME = 'Kortix'

export const CompareKortixPage = () => {
  const { t } = useI18n(localeI18n)

  return (
    <Layout showBackButton={false}>
      <ComparisonHero
        title={t('{productName} vs {alternative}', {
          productName: PRODUCT.displayName,
          alternative: ALT_NAME,
        })}
        subtitle={t(
          'Full AI agent orchestration that runs in your browser \u2014 no Docker, no database, no infrastructure.',
        )}
      />

      <TLDRCards
        items={[
          {
            icon: 'Lock',
            title: t('Privacy'),
            devs: t('100% client-side'),
            alt: t('Self-hosted (Docker + Supabase)'),
          },
          {
            icon: 'WindowCheck',
            title: t('Setup'),
            devs: t('Zero install (browser)'),
            alt: t('Docker + Supabase stack'),
          },
          {
            icon: 'Cpu',
            title: t('Architecture'),
            devs: t('Browser-native PWA'),
            alt: t('Server-based (Python/FastAPI)'),
          },
        ]}
        altName={ALT_NAME}
      />

      <FeatureTable
        features={[
          [
            t('Open Source'),
            t('MIT License'),
            t('Yes (custom license)'),
            'yes',
            'partial',
          ],
          [
            t('Browser-Native'),
            t('Yes'),
            t('No (Next.js dashboard)'),
            'yes',
            'no',
          ],
          [
            t('Data Stays Local'),
            t('Yes'),
            t('Self-hosted Supabase'),
            'yes',
            'partial',
          ],
          [
            t('Multi-Agent Orchestration'),
            t('Advanced'),
            t('Single agent runtimes'),
            'yes',
            'partial',
          ],
          [
            t('Bring Your Own Keys'),
            t('Yes'),
            t('Yes (via LiteLLM)'),
            'yes',
            'yes',
          ],
          [t('Offline Capable'), t('Yes'), t('No'), 'yes', 'no'],
          [t('P2P Sync'), t('Yes'), t('No'), 'yes', 'no'],
          [t('Agent Memory'), t('Yes'), t('Limited'), 'yes', 'partial'],
          [
            t('LLM Provider Choice'),
            t('6+ providers'),
            t('Multiple (via LiteLLM)'),
            'yes',
            'yes',
          ],
          [
            t('Zero Infrastructure'),
            t('Yes'),
            t('Requires Docker + Supabase'),
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
            icon: 'WindowCheck',
            title: t('Zero Setup'),
            desc: t(
              'Open your browser and start working \u2014 no Docker, no Supabase, no FastAPI server. {alternative} requires a full infrastructure stack to self-host.',
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Lock',
            title: t('True Privacy'),
            desc: t(
              'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. No server at all, not even a self-hosted one.',
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Globe',
            title: t('Browser-Native'),
            desc: t(
              'Works on any device with a browser \u2014 desktop, tablet, or mobile. No server requirements, no Docker containers, fully offline capable.',
            ),
            gradient: 'from-blue-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Server',
            title: t('No Infrastructure'),
            desc: t(
              'No Docker containers, no PostgreSQL database, no Python backend to maintain. {alternative} needs ongoing server management and updates.',
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
            { text: t('Requires server hosting costs'), included: false },
            { text: t('Docker + Supabase infrastructure'), included: false },
            { text: t('Ongoing maintenance overhead'), included: false },
            {
              text: t('Server administration required'),
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
            t('Need Docker-sandboxed code execution for agent runtimes'),
            t('Want server-side agent runtimes with persistent processes'),
            t('Need built-in browser automation via Playwright'),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
