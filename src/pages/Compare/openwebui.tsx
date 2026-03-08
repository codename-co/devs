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

const ALT_NAME = 'Open WebUI'

export const CompareOpenWebUIPage = () => {
  const { t } = useI18n(localeI18n)

  return (
    <Layout showBackButton={false}>
      <ComparisonHero
        title={t('{productName} vs {alternative}', {
          productName: PRODUCT.displayName,
          alternative: ALT_NAME,
        })}
        subtitle={t(
          'Full AI agent orchestration that runs in your browser \u2014 no Docker, no Python, no server to maintain.',
        )}
      />

      <TLDRCards
        items={[
          {
            icon: 'Lock',
            title: t('Privacy'),
            devs: t('100% client-side'),
            alt: t('Self-hosted server required'),
          },
          {
            icon: 'WindowCheck',
            title: t('Setup'),
            devs: t('Zero install (browser)'),
            alt: t('Docker + Python stack'),
          },
          {
            icon: 'Group',
            title: t('Orchestration'),
            devs: t('Multi-agent teams'),
            alt: t('Single chat interface'),
          },
        ]}
        altName={ALT_NAME}
      />

      <FeatureTable
        features={[
          [
            t('Open Source'),
            t('MIT License'),
            t('Open WebUI License'),
            'yes',
            'partial',
          ],
          [
            t('Browser-Native'),
            t('Yes'),
            t('No (server required)'),
            'yes',
            'no',
          ],
          [
            t('Data Stays Local'),
            t('Yes'),
            t('Yes (self-hosted)'),
            'yes',
            'yes',
          ],
          [
            t('Multi-Agent Orchestration'),
            t('Advanced'),
            t('No (single chat)'),
            'yes',
            'no',
          ],
          [
            t('Bring Your Own Keys'),
            t('Yes'),
            t('Yes'),
            'yes',
            'yes',
          ],
          [
            t('Offline Capable'),
            t('Yes'),
            t('No'),
            'yes',
            'no',
          ],
          [t('P2P Sync'), t('Yes'), t('No'), 'yes', 'no'],
          [
            t('Agent Memory'),
            t('Yes'),
            t('Experimental'),
            'yes',
            'partial',
          ],
          [
            t('LLM Provider Choice'),
            t('6+ providers'),
            t('OpenAI-compatible APIs + Ollama'),
            'yes',
            'yes',
          ],
          [
            t('Free Tier'),
            t('Unlimited'),
            t('Unlimited (self-hosted)'),
            'yes',
            'yes',
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
            title: t('True Zero Infrastructure'),
            desc: t(
              'Open your browser and start working \u2014 no Docker, no Python, no database, no server to maintain. {alternative} requires Docker, Python, and a database backend to self-host.',
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Group',
            title: t('Multi-Agent Orchestration'),
            desc: t(
              'Coordinate specialized agent teams with dependency resolution and parallel execution. {alternative} is a single-chat interface without multi-agent orchestration.',
            ),
            gradient: 'from-blue-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Lock',
            title: t('Serverless Privacy'),
            desc: t(
              'All data stays in your browser \u2014 IndexedDB, encrypted tokens, zero telemetry. No server at all, not even a self-hosted one. {alternative} requires a running server that stores your data.',
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Shuffle',
            title: t('P2P Collaboration'),
            desc: t(
              'Cross-device synchronization via Yjs/WebRTC with no central server. {alternative} requires Redis and a database for multi-user support.',
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
            {
              text: t('Requires Docker + Python infrastructure'),
              included: false,
            },
            {
              text: t('Enterprise plans for advanced features'),
              included: false,
            },
            { text: t('Server administration required'), included: false },
            { text: t('No multi-agent orchestration'), included: false },
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
              'Need advanced RAG with vector database options (ChromaDB, PGVector, Qdrant)',
            ),
            t(
              'Want enterprise features like RBAC, LDAP, SSO, and horizontal scaling',
            ),
            t(
              'Need image generation, voice/video calls, and a Pipelines plugin framework',
            ),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
