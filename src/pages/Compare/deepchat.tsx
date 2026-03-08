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

const ALT_NAME = 'DeepChat'

export const CompareDeepChatPage = () => {
  const { t } = useI18n(localeI18n)

  return (
    <Layout showBackButton={false}>
      <ComparisonHero
        title={t('{productName} vs {alternative}', {
          productName: PRODUCT.displayName,
          alternative: ALT_NAME,
        })}
        subtitle={t(
          'Full AI agent orchestration that runs in your browser \u2014 no download, no Electron, no limits.',
        )}
      />

      <TLDRCards
        items={[
          {
            icon: 'Globe',
            title: t('Setup'),
            devs: t('Zero install (browser)'),
            alt: t('Electron app download'),
          },
          {
            icon: 'Group',
            title: t('Orchestration'),
            devs: t('Multi-agent teams'),
            alt: t('Single chat interface'),
          },
          {
            icon: 'WindowCheck',
            title: t('Architecture'),
            devs: t('Browser-native PWA'),
            alt: t('Desktop app (Electron)'),
          },
        ]}
        altName={ALT_NAME}
      />

      <FeatureTable
        features={[
          [t('Open Source'), t('MIT License'), t('Apache 2.0'), 'yes', 'yes'],
          [
            t('Browser-Native'),
            t('Yes'),
            t('No (Electron desktop)'),
            'yes',
            'no',
          ],
          [t('Data Stays Local'), t('Yes'), t('Yes'), 'yes', 'yes'],
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
            t('Yes (30+ providers)'),
            'yes',
            'yes',
          ],
          [
            t('Offline Capable'),
            t('Yes'),
            t('Yes (with Ollama)'),
            'yes',
            'yes',
          ],
          [t('P2P Sync'), t('Yes'), t('No'), 'yes', 'no'],
          [t('Agent Memory'), t('Yes'), t('No'), 'yes', 'no'],
          [
            t('LLM Provider Choice'),
            t('6+ providers'),
            t('30+ providers'),
            'yes',
            'yes',
          ],
          [t('Free Tier'), t('Unlimited'), t('Unlimited'), 'yes', 'yes'],
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
            icon: 'Globe',
            title: t('Zero Install'),
            desc: t(
              'No download, no Electron app. Just open your browser on any device. {alternative} requires a desktop application download.',
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Group',
            title: t('Multi-Agent Orchestration'),
            desc: t(
              'Coordinate specialized agent teams with dependency resolution. {alternative} is a single-chat interface without orchestration.',
            ),
            gradient: 'from-blue-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Brain',
            title: t('Agent Memory & Learning'),
            desc: t(
              'Persistent agent memory with human review, categories, confidence levels. {alternative} has no memory system.',
            ),
            gradient: 'from-purple-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Shuffle',
            title: t('P2P Sync'),
            desc: t(
              'Cross-device synchronization via Yjs/WebRTC. {alternative} is limited to one device.',
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
        ]}
      />

      <PricingComparison
        altTier={{
          name: ALT_NAME,
          price: t('Free'),
          features: [
            { text: t('Desktop-only (Electron)'), included: false },
            { text: t('No multi-agent orchestration'), included: false },
            { text: t('No P2P sync or collaboration'), included: false },
            { text: t('No agent memory system'), included: false },
          ],
        }}
      />

      <HonestTake
        warningSide={{
          title: t('Consider {alternative} if you\u2026', {
            alternative: ALT_NAME,
          }),
          items: [
            t('Prefer a native desktop app experience with multi-window UI'),
            t('Need MCP tool calling and ACP agent protocol support'),
            t('Want built-in search enhancement (Brave, Google, Bing)'),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
