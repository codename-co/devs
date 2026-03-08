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

const ALT_NAME = 'HugstonOne'

export const CompareHugstonOnePage = () => {
  const { t } = useI18n(localeI18n)

  return (
    <Layout showBackButton={false}>
      <ComparisonHero
        title={t('{productName} vs {alternative}', {
          productName: PRODUCT.displayName,
          alternative: ALT_NAME,
        })}
        subtitle={t(
          'Multi-agent orchestration in any browser \u2014 vs a Windows-only local inference app.',
        )}
      />

      <TLDRCards
        items={[
          {
            icon: 'Globe',
            title: t('Platform'),
            devs: t('Any browser, any OS'),
            alt: t('Windows desktop only'),
          },
          {
            icon: 'Group',
            title: t('Agents'),
            devs: t('Multi-agent orchestration'),
            alt: t('Single-model inference'),
          },
          {
            icon: 'Code',
            title: t('Open Source'),
            devs: t('MIT License'),
            alt: t('Proprietary (free)'),
          },
        ]}
        altName={ALT_NAME}
      />

      <FeatureTable
        features={[
          [
            t('Open Source'),
            t('MIT License'),
            t('No (proprietary)'),
            'yes',
            'no',
          ],
          [t('Browser-Native'), t('Yes'), t('No (desktop app)'), 'yes', 'no'],
          [
            t('Cross-Platform'),
            t('Any OS with a browser'),
            t('Windows only'),
            'yes',
            'no',
          ],
          [
            t('Multi-Agent Orchestration'),
            t('Advanced'),
            t('No \u2014 single-model only'),
            'yes',
            'no',
          ],
          [
            t('Cloud LLM Providers'),
            t('6+ providers'),
            t('None \u2014 local GGUF only'),
            'yes',
            'no',
          ],
          [
            t('Local Model Support'),
            t('Via Ollama'),
            t('10,000+ GGUF models'),
            'partial',
            'yes',
          ],
          [t('Agent Memory'), t('Yes'), t('No'), 'yes', 'no'],
          [t('Knowledge Base'), t('Yes'), t('No'), 'yes', 'no'],
          [t('P2P Sync'), t('Yes'), t('No'), 'yes', 'no'],
          [
            t('Offline Capable'),
            t('Yes'),
            t('Yes \u2014 fully local'),
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
            icon: 'Globe',
            title: t('Any Device, Any OS'),
            desc: t(
              'Works on Mac, Linux, Windows, tablets, and phones \u2014 anywhere you have a browser. {alternative} is locked to Windows desktops.',
            ),
            gradient: 'from-emerald-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Group',
            title: t('Multi-Agent Teams'),
            desc: t(
              'Orchestrate entire teams of specialized AI agents that collaborate on complex tasks. {alternative} runs a single model at a time.',
            ),
            gradient: 'from-amber-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Cloud',
            title: t('Cloud + Local Models'),
            desc: t(
              'Access OpenAI, Anthropic, Gemini, Mistral, and more \u2014 plus local models via Ollama. {alternative} only supports local GGUF inference.',
            ),
            gradient: 'from-blue-500/10 via-transparent to-transparent',
          },
          {
            icon: 'Code',
            title: t('Open Source & Extensible'),
            desc: t(
              'Fully open-source under the MIT license with a marketplace, plugins, and community contributions. {alternative} is proprietary and closed.',
            ),
            gradient: 'from-purple-500/10 via-transparent to-transparent',
          },
        ]}
      />

      <PricingComparison
        altTier={{
          name: ALT_NAME,
          price: t('Free (email required)'),
          features: [
            { text: t('Windows only \u2014 no Mac or Linux'), included: false },
            { text: t('No cloud LLM provider support'), included: false },
            { text: t('No multi-agent orchestration'), included: false },
            { text: t('Proprietary \u2014 not open source'), included: false },
          ],
        }}
      />

      <HonestTake
        warningSide={{
          title: t('Consider {alternative} if you\u2026', {
            alternative: ALT_NAME,
          }),
          items: [
            t('Want a simple local GGUF inference app on Windows'),
            t('Need GPU-accelerated local model inference with image-to-text'),
            t(
              'Prefer a desktop app with an integrated code editor and live preview',
            ),
          ],
        }}
      />

      <FinalCTA />
    </Layout>
  )
}
