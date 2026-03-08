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

const ALT_NAME = 'Lemon AI'

export const CompareLemonAIPage = () => {
  const { t } = useI18n(localeI18n)

  return (
    <Layout showBackButton={false}>
      <ComparisonHero
        title={t('{productName} vs {alternative}', {
          productName: PRODUCT.displayName,
          alternative: ALT_NAME,
        })}
        subtitle={t(
          'Full AI agent orchestration that runs in your browser \u2014 no Docker, no Node.js, no limits.',
        )}
      />

      <TLDRCards
        items={[
          {
            icon: 'WindowCheck',
            title: t('Setup'),
            devs: t('Zero install (browser)'),
            alt: t('Docker + Node.js'),
          },
          {
            icon: 'Group',
            title: t('Orchestration'),
            devs: t('Multi-agent teams'),
            alt: t('Single agent'),
          },
          {
            icon: 'Globe',
            title: t('Architecture'),
            devs: t('Browser-native PWA'),
            alt: t('Desktop app (Vue + Node.js)'),
          },
        ]}
        altName={ALT_NAME}
      />

      <FeatureTable
        features={[
          [t('Open Source'), t('MIT License'), t('Apache 2.0'), 'yes', 'yes'],
          [t('Browser-Native'), t('Yes'), t('No (desktop app)'), 'yes', 'no'],
          [
            t('Data Stays Local'),
            t('Yes'),
            t('Yes (Docker sandbox)'),
            'yes',
            'yes',
          ],
          [t('Multi-Agent Orchestration'), t('Advanced'), t('No'), 'yes', 'no'],
          [t('Bring Your Own Keys'), t('Yes'), t('Yes'), 'yes', 'yes'],
          [
            t('Offline Capable'),
            t('Yes'),
            t('Partial (local LLM only)'),
            'yes',
            'partial',
          ],
          [t('P2P Sync'), t('Yes'), t('No'), 'yes', 'no'],
          [t('Agent Memory'), t('Yes'), t('Self-evolving'), 'yes', 'yes'],
          [
            t('LLM Provider Choice'),
            t('6+ providers'),
            t('6+ providers'),
            'yes',
            'yes',
          ],
          [
            t('Free Tier'),
            t('Unlimited'),
            t('Free + subscription'),
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
            icon: 'WindowCheck',
            title: t('Zero Setup'),
            desc: t(
              'No Docker or Node.js needed, just open your browser. {alternative} requires a local Docker environment and Node.js backend to run.',
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Group',
            title: t('Multi-Agent Teams'),
            desc: t(
              'Full team orchestration with dependency resolution, not just single agent. {alternative} runs one agent at a time.',
            ),
            gradient: 'from-blue-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Globe',
            title: t('Browser-Native'),
            desc: t(
              'Works on any device, no installation, progressive web app. {alternative} is a desktop application built with Vue + Node.js.',
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Shuffle',
            title: t('P2P Collaboration'),
            desc: t(
              'Cross-device sync via WebRTC, real-time collaboration. {alternative} has no built-in sync or collaboration features.',
            ),
            gradient: 'from-purple-500/10 via-transparent to-transparent',
          },
        ]}
      />

      <PricingComparison
        altTier={{
          name: ALT_NAME,
          price: t('Free + paid tiers'),
          features: [
            { text: t('Online subscription available'), included: false },
            { text: t('Requires Docker for sandbox'), included: false },
            { text: t('Node.js backend required'), included: false },
            { text: t('Single agent architecture'), included: false },
          ],
        }}
      />

      <HonestTake
        warningSide={{
          title: t('Consider {alternative} if you\u2026', {
            alternative: ALT_NAME,
          }),
          items: [
            t('Need Docker VM sandbox for safe code execution'),
            t('Want built-in deep search and vibe coding'),
            t('Prefer a self-evolving memory system'),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
