import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Link,
} from '@heroui/react'
import { Icon } from '@/components/Icon'
import { useI18n, useUrl } from '@/i18n'
import { IconName } from '@/lib/types'
import { Container, Section, Title } from '@/components'
import { LLMService } from '@/lib/llm'
import Layout from '@/layouts/Default'
import { PRODUCT } from '@/config/product'
import pkg from '@/../package.json'
import localI18n from './i18n'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const PRINCIPLES = [
  {
    icon: 'Lock' as IconName,
    title: 'Privacy by Design',
    description:
      'Every byte of your data stays on your device. No servers. No telemetry. No compromise.',
    color: 'text-success-600 bg-success-50 dark:bg-success-100/10',
  },
  {
    icon: 'Globe' as IconName,
    title: 'Universally Accessible',
    description:
      'A browser is all you need. No installation, no GPU, no special hardware \u2014 just open and create.',
    color: 'text-primary-600 bg-primary-50 dark:bg-primary-100/10',
  },
  {
    icon: 'Community' as IconName,
    title: 'Open Source Forever',
    description:
      'Built in the open, shaped by the community. Every line of code is yours to read, improve, and share.',
    color: 'text-secondary-600 bg-secondary-50 dark:bg-secondary-100/10',
  },
] as const

const PILLARS = [
  {
    icon: 'Sparks' as IconName,
    title: 'Multi-Agent Orchestration',
    subtitle: 'Collective Intelligence',
    description:
      'Compose teams of specialised AI agents that plan, execute, and validate together \u2014 mirroring how the best human teams operate.',
    gradient:
      'from-violet-500/10 via-transparent to-transparent dark:from-violet-500/5',
  },
  {
    icon: 'Brain' as IconName,
    title: 'Provider Independence',
    subtitle: 'Your Models, Your Choice',
    description:
      'Seamlessly switch between OpenAI, Anthropic, Google Gemini, Mistral, Ollama, or any OpenAI-compatible endpoint. Never locked in.',
    gradient:
      'from-blue-500/10 via-transparent to-transparent dark:from-blue-500/5',
  },
  {
    icon: 'Shield' as IconName,
    title: 'Zero-Trust Architecture',
    subtitle: 'Security as a Foundation',
    description:
      'Web Crypto API encrypts your tokens. Service Workers sandbox execution. IndexedDB keeps everything local. Defense in depth, by default.',
    gradient:
      'from-emerald-500/10 via-transparent to-transparent dark:from-emerald-500/5',
  },
  {
    icon: 'Strategy' as IconName,
    title: 'Intelligent Task Analysis',
    subtitle: 'Complexity, Simplified',
    description:
      'An LLM-powered analyser breaks your request into requirements, recruits the right agents, resolves dependencies, and orchestrates delivery.',
    gradient:
      'from-amber-500/10 via-transparent to-transparent dark:from-amber-500/5',
  },
  {
    icon: 'Database' as IconName,
    title: 'Offline-First & P2P',
    subtitle: 'Works Anywhere',
    description:
      'Fully functional without internet after first load. Optional Yjs-powered P2P sync lets you collaborate across devices without a central server.',
    gradient:
      'from-rose-500/10 via-transparent to-transparent dark:from-rose-500/5',
  },
  {
    icon: 'Puzzle' as IconName,
    title: 'Extensible by Nature',
    subtitle: 'Build on Top',
    description:
      'A marketplace of agents, tools, connectors, and apps \u2014 plus a sandboxed Extension Bridge so the community can create and share new capabilities.',
    gradient:
      'from-cyan-500/10 via-transparent to-transparent dark:from-cyan-500/5',
  },
] as const

const USE_CASES = [
  {
    icon: 'GraduationCap' as IconName,
    persona: 'Students',
    action: 'Research, study planning & assignment help',
  },
  {
    icon: 'Code' as IconName,
    persona: 'Developers',
    action: 'Rapid prototyping, code generation & reviews',
  },
  {
    icon: 'DesignPencil' as IconName,
    persona: 'Creators',
    action: 'Brainstorming, writing & content production',
  },
  {
    icon: 'Activity' as IconName,
    persona: 'Researchers',
    action: 'Literature review, data analysis & hypothesis testing',
  },
  {
    icon: 'Strategy' as IconName,
    persona: 'Managers',
    action: 'Project planning, task breakdown & operations',
  },
  {
    icon: 'LightBulbOn' as IconName,
    persona: 'Entrepreneurs',
    action: 'Idea validation, strategy & business planning',
  },
] as const

const FAQ_KEYS = [
  {
    q: 'Is my data private?',
    a: 'Absolutely. All processing happens locally in your browser. We never collect, transmit, or store any of your data. Your API keys are encrypted with the Web Crypto API and never leave your device.',
  },
  {
    q: 'Which AI providers are supported?',
    a: 'We support {providers}, and any provider compatible with the OpenAI API specification. You can switch providers at any time without losing your conversations or data.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'Nothing at all. DEVS is a Progressive Web App that runs entirely in your browser. You can optionally \u201Cinstall\u201D it to your home screen for a native-like experience, but it\u2019s never required.',
  },
  {
    q: 'Is this really free and open source?',
    a: 'Yes \u2014 {license} licensed and always will be. The entire codebase is on GitHub. You can self-host, fork, or contribute. No premium tiers, no paywalls.',
  },
  {
    q: 'Can I use it offline?',
    a: 'After the first load, the Service Worker caches everything you need. You can create agents, manage knowledge, and review past conversations without any internet connection. LLM calls obviously require connectivity to the provider.',
  },
  {
    q: 'How does multi-agent orchestration work?',
    a: 'When you describe a complex task, the built-in orchestrator analyses it, breaks it into subtasks, recruits specialised agents, resolves dependencies, and coordinates parallel execution \u2014 just like a well-run project team.',
  },
] as const

// FAQ data moved to FAQ_KEYS above, with template variables for dynamic content

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AboutPage = () => {
  const { t } = useI18n(localI18n)
  const url = useUrl()

  const providers = LLMService.listProviders()
    .filter((p) => p !== 'custom')
    .join(', ')

  const steps = [
    {
      num: '01',
      title: t('Configure your AI provider'),
      desc: t(
        'Connect your preferred LLM \u2014 OpenAI, Anthropic, Gemini, Ollama, or any compatible endpoint.',
      ),
      url: url(`${location.pathname}${location.search}#settings/providers`),
      icon: 'Settings' as IconName,
    },
    {
      num: '02',
      title: t('Describe your task'),
      desc: t(
        'Tell DEVS what you need in natural language. Be ambitious \u2014 the orchestrator thrives on complexity.',
      ),
      icon: 'ChatLines' as IconName,
    },
    {
      num: '03',
      title: t('Watch agents collaborate'),
      desc: t(
        'See specialised agents plan, execute, and validate in real-time. Intervene, guide, or just observe.',
      ),
      icon: 'Sparks' as IconName,
    },
    {
      num: '04',
      title: t('Receive & refine'),
      desc: t(
        'Get structured artefacts \u2014 code, docs, analyses \u2014 and iterate with feedback until it\u2019s right.',
      ),
      icon: 'CheckCircle' as IconName,
    },
  ]

  return (
    <Layout
      showBackButton={false}
      // header={{
      //   icon: {
      //     name: 'InfoCircle',
      //     color: 'text-default-300 dark:text-default-400',
      //   },
      //   color: 'bg-default-50',
      //   title: 'About',
      //   subtitle: PRODUCT.displayName,
      // }}
    >
      {/* ================================================================= */}
      {/* HERO — Vision Statement                                           */}
      {/* ================================================================= */}
      <Section mainClassName="rounded-t-xl bg-gradient-to-b from-primary-50/50 via-transparent to-transparent dark:from-primary-900/10">
        <Container>
          <div className="text-center space-y-6 py-4 md:py-8">
            <Title level={1} size="5xl" className="!leading-tight">
              {t('AI Augmentation for Everyone')}
            </Title>

            <p className="max-w-2xl mx-auto text-lg text-default-600 leading-relaxed">
              {t(
                '{product} is a browser-native AI agent orchestration platform. Delegate complex tasks to teams of specialised agents that plan, collaborate, and deliver \u2014 all running',
                { product: PRODUCT.displayName },
              )}{' '}
              <strong className="text-foreground">
                {t('entirely on your device')}
              </strong>
              .
            </p>

            <Divider className="max-w-xs mx-auto !my-8 opacity-40" />

            <blockquote className="max-w-xl mx-auto italic text-default-500 text-sm leading-relaxed border-l-3 border-primary-300 dark:border-primary-700 pl-4 text-left">
              {t(
                '\u201CAI augmentation shouldn\u2019t be a luxury for the few, but a fundamental tool available to all \u2014 where anyone can leverage the power of AI teams to amplify their capabilities and achieve their goals.\u201D',
              )}
            </blockquote>
          </div>
        </Container>
      </Section>

      {/* ================================================================= */}
      {/* PRINCIPLES — The three pillars of our philosophy                   */}
      {/* ================================================================= */}
      <Section>
        <Container>
          <div className="text-center mb-2">
            <Chip size="sm" variant="flat" color="default" className="mb-3">
              {t('Philosophy')}
            </Chip>
            <Title level={2} className="!mb-1">
              {t('Built on Conviction')}
            </Title>
            <p className="text-default-500 text-sm max-w-lg mx-auto">
              {t(
                'Three non-negotiable principles guide every decision we make.',
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PRINCIPLES.map((p, i) => (
              <Card
                key={i}
                shadow="sm"
                className="border border-default-100 dark:border-default-50/10"
              >
                <CardBody className="p-6 text-center space-y-3">
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl mx-auto ${p.color}`}
                  >
                    <Icon name={p.icon} className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-base">{t(p.title)}</h3>
                  <p className="text-sm text-default-500 leading-relaxed">
                    {t(p.description)}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* ================================================================= */}
      {/* CAPABILITIES — What makes DEVS unique                              */}
      {/* ================================================================= */}
      <Section mainClassName="bg-default-50/50 dark:bg-default-50/5">
        <Container>
          <div className="text-center mb-2">
            <Chip size="sm" variant="flat" color="primary" className="mb-3">
              {t('Capabilities')}
            </Chip>
            <Title level={2} className="!mb-1">
              {t('Powerful by Design')}
            </Title>
            <p className="text-default-500 text-sm max-w-lg mx-auto">
              {t(
                'A depth of engineering so you can focus on what matters \u2014 your ideas.',
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PILLARS.map((pillar, i) => (
              <Card
                key={i}
                shadow="none"
                className={`border border-default-100 dark:border-default-50/10 bg-gradient-to-br ${pillar.gradient}`}
              >
                <CardBody className="p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <Icon
                      name={pillar.icon}
                      className="w-5 h-5 text-default-600"
                    />
                    <div>
                      <h3 className="font-semibold text-sm">
                        {t(pillar.title)}
                      </h3>
                      <p className="text-xs text-default-400">
                        {t(pillar.subtitle)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-default-600 leading-relaxed">
                    {t(pillar.description)}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* ================================================================= */}
      {/* HOW IT WORKS — Step-by-step                                        */}
      {/* ================================================================= */}
      <Section>
        <Container>
          <div className="text-center mb-2">
            <Chip size="sm" variant="flat" color="secondary" className="mb-3">
              {t('Getting Started')}
            </Chip>
            <Title level={2} className="!mb-1">
              {t('Four Steps to Delegation')}
            </Title>
            <p className="text-default-500 text-sm max-w-lg mx-auto">
              {t('From prompt to polished output in minutes, not hours.')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((step) => (
              <div key={step.num} className="relative group">
                <div className="space-y-3">
                  <span className="text-4xl font-extrabold text-default-100 dark:text-default-100/20 select-none">
                    {step.num}
                  </span>
                  <div className="flex items-center gap-2">
                    <Icon
                      name={step.icon}
                      className="w-4 h-4 text-primary-500"
                    />
                    <h4 className="font-semibold text-sm">
                      {step.url ? (
                        <Link href={step.url} className="text-sm font-semibold">
                          {step.title}
                        </Link>
                      ) : (
                        step.title
                      )}
                    </h4>
                  </div>
                  <p className="text-xs text-default-500 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ================================================================= */}
      {/* USE CASES — Who is it for                                          */}
      {/* ================================================================= */}
      <Section mainClassName="bg-default-50/50 dark:bg-default-50/5">
        <Container>
          <div className="text-center mb-2">
            <Chip size="sm" variant="flat" color="warning" className="mb-3">
              {t('For Everyone')}
            </Chip>
            <Title level={2} className="!mb-1">
              {t('Built for Builders')}
            </Title>
            <p className="text-default-500 text-sm max-w-lg mx-auto">
              {t(
                'Whether you\u2019re writing code or writing prose \u2014 DEVS adapts to you.',
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {USE_CASES.map((uc) => (
              <Card
                key={uc.persona}
                shadow="none"
                className="border border-default-100 dark:border-default-50/10"
              >
                <CardBody className="p-4 flex flex-col items-center text-center gap-2">
                  <Icon name={uc.icon} className="w-6 h-6 text-default-400" />
                  <span className="font-medium text-sm">{t(uc.persona)}</span>
                  <span className="text-xs text-default-400 leading-snug hidden sm:block">
                    {t(uc.action)}
                  </span>
                </CardBody>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* ================================================================= */}
      {/* FAQ                                                                */}
      {/* ================================================================= */}
      <Section mainClassName="bg-default-50/50 dark:bg-default-50/5">
        <Container>
          <div className="text-center mb-2">
            <Chip size="sm" variant="flat" color="default" className="mb-3">
              {t('FAQ')}
            </Chip>
            <Title level={2} className="!mb-1">
              {t('Common Questions')}
            </Title>
          </div>

          <Accordion variant="splitted" selectionMode="multiple">
            {FAQ_KEYS.map((faq, i) => {
              const vars =
                faq.q === 'Which AI providers are supported?'
                  ? { providers }
                  : faq.q === 'Is this really free and open source?'
                    ? { license: pkg.license }
                    : undefined
              return (
                <AccordionItem
                  key={i}
                  aria-label={t(faq.q)}
                  title={
                    <span className="text-sm font-medium">{t(faq.q)}</span>
                  }
                >
                  <p className="text-sm text-default-600 leading-relaxed pb-2">
                    {t(faq.a, vars)}
                  </p>
                </AccordionItem>
              )
            })}
          </Accordion>
        </Container>
      </Section>

      {/* ================================================================= */}
      {/* CTA — Contribute                                                   */}
      {/* ================================================================= */}
      <Section>
        <Container>
          <Card
            shadow="none"
            className="bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/15 dark:to-secondary-900/15 border border-primary-100 dark:border-primary-800/30"
          >
            <CardBody className="p-8 md:p-12 text-center space-y-5">
              <Icon name="Heart" className="w-8 h-8 text-danger-400 mx-auto" />
              <Title level={2} size="2xl" className="!mb-0">
                {t('Shape the Future With Us')}
              </Title>
              <p className="max-w-lg mx-auto text-sm text-default-600 leading-relaxed">
                {t(
                  '{product} is built by people who believe technology should empower, not enclose. Every contribution \u2014 code, ideas, feedback \u2014 makes AI augmentation more accessible to the world.',
                  { product: PRODUCT.displayName },
                )}
              </p>

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button
                  as={Link}
                  href="https://github.com/codename-co/devs"
                  target="_blank"
                  isExternal
                  color="default"
                  variant="flat"
                  startContent={<Icon name="GitHub" />}
                >
                  {t('View on GitHub')}
                </Button>
                <Button
                  as={Link}
                  href="https://github.com/codename-co/devs/issues"
                  target="_blank"
                  isExternal
                  color="primary"
                  variant="flat"
                  startContent={<Icon name="ChatPlusIn" />}
                >
                  {t('Open an Issue')}
                </Button>
              </div>

              <p className="text-xs text-default-400 pt-2">
                v{pkg.version} &middot; {pkg.license} License &middot;{' '}
                {t('Made with care for humans everywhere.')}
              </p>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </Layout>
  )
}
