import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Link,
  Tab,
  Tabs,
} from '@heroui/react'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { useI18n, useUrl } from '@/i18n'
import { IconName } from '@/lib/types'
import { Container, Section, Title } from '@/components'
import { LLMService } from '@/lib/llm'
import { WorkspaceShell } from '@/pages/Workspace/WorkspaceShell'
import { PRODUCT } from '@/config/product'
import pkg from '@/../package.json'
import { ProductTourVideo } from '@/pages/Tour/videos/product-tour'
import { AgentStudioVideo } from '@/pages/Tour/videos/agent-studio'
import { TaskDelegationVideo } from '@/pages/Tour/videos/task-delegation'
import { PrivacyFirstVideo } from '@/pages/Tour/videos/privacy-first'
import { InboxWorkflowVideo } from '@/pages/Tour/videos/inbox-workflow'
import localI18n from './i18n'

// ---------------------------------------------------------------------------
// Tour videos — embedded contextually below "How it works"
// ---------------------------------------------------------------------------

const TOUR_VIDEOS = [
  {
    id: 'product',
    icon: 'PlaySolid' as IconName,
    title: 'Product Tour',
    tagline: 'The full DEVS story in 30 seconds',
    Component: ProductTourVideo,
  },
  {
    id: 'task-delegation',
    icon: 'Strategy' as IconName,
    title: 'Task Delegation',
    tagline: 'Delegate, don\u2019t chat',
    Component: TaskDelegationVideo,
  },
  {
    id: 'agent-studio',
    icon: 'Sparks' as IconName,
    title: 'Agent Studio',
    tagline: 'Build your own AI team',
    Component: AgentStudioVideo,
  },
  {
    id: 'privacy-first',
    icon: 'Lock' as IconName,
    title: 'Privacy First',
    tagline: 'Your keys. Your data. Your browser.',
    Component: PrivacyFirstVideo,
  },
  {
    id: 'inbox-workflow',
    icon: 'ChatLines' as IconName,
    title: 'Inbox Workflow',
    tagline: 'Your AI inbox',
    Component: InboxWorkflowVideo,
  },
] as const

type TourVideoId = (typeof TOUR_VIDEOS)[number]['id']

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const PRINCIPLES = [
  {
    icon: 'Lock' as IconName,
    title: 'Your Data Stays Yours',
    description:
      'Everything stays on your device. Nothing is sent to our servers. No tracking, no snooping, no exceptions.',
    color: 'text-success-600 bg-success-50 dark:bg-success-100/10',
  },
  {
    icon: 'Globe' as IconName,
    title: 'Works in Any Browser',
    description:
      'No downloads, no special equipment. If you can open a web page, you can use DEVS.',
    color: 'text-primary-600 bg-primary-50 dark:bg-primary-100/10',
  },
  {
    icon: 'Community' as IconName,
    title: 'Free & Open Source',
    description:
      'The code is public, the community shapes it, and it will always be free. No hidden costs, ever.',
    color: 'text-secondary-600 bg-secondary-50 dark:bg-secondary-100/10',
  },
] as const

const PILLARS = [
  {
    icon: 'Sparks' as IconName,
    title: 'A Team, Not Just a Chatbot',
    subtitle: 'Better Together',
    description:
      'Instead of one AI trying to do everything, multiple specialised helpers team up \u2014 each one great at something different, just like a real team.',
    gradient:
      'from-violet-500/10 via-transparent to-transparent dark:from-violet-500/5',
  },
  {
    icon: 'Brain' as IconName,
    title: 'Use Any AI You Like',
    subtitle: 'Freedom of Choice',
    description:
      'Works with OpenAI, Google, Anthropic, Mistral, and many more. Switch anytime \u2014 your conversations and data stay put.',
    gradient:
      'from-blue-500/10 via-transparent to-transparent dark:from-blue-500/5',
  },
  {
    icon: 'Shield' as IconName,
    title: 'Bank-Level Security',
    subtitle: 'Locked Down by Default',
    description:
      'Your passwords and keys are encrypted right in your browser. Nothing sensitive ever travels over the internet.',
    gradient:
      'from-emerald-500/10 via-transparent to-transparent dark:from-emerald-500/5',
  },
  {
    icon: 'Strategy' as IconName,
    title: 'It Breaks Down the Hard Stuff',
    subtitle: 'Smart Under the Hood',
    description:
      'Describe a big goal and the system figures out what needs to happen, assigns the right helpers, and coordinates everything automatically.',
    gradient:
      'from-amber-500/10 via-transparent to-transparent dark:from-amber-500/5',
  },
  {
    icon: 'Database' as IconName,
    title: 'Works Without Internet',
    subtitle: 'Always On, Always Yours',
    description:
      'Once loaded, it works offline. Optionally sync across your devices without relying on anyone else\u2019s servers.',
    gradient:
      'from-rose-500/10 via-transparent to-transparent dark:from-rose-500/5',
  },
  {
    icon: 'Puzzle' as IconName,
    title: 'Endlessly Customisable',
    subtitle: 'Make It Your Own',
    description:
      'Browse a library of ready-made tools, connectors, and AI helpers \u2014 or let the community build new ones.',
    gradient:
      'from-cyan-500/10 via-transparent to-transparent dark:from-cyan-500/5',
  },
] as const

const USE_CASES = [
  {
    icon: 'GraduationCap' as IconName,
    persona: 'Students',
    action: 'Research, study plans & homework help',
  },
  {
    icon: 'Code' as IconName,
    persona: 'Developers',
    action: 'Quick prototypes, code & reviews',
  },
  {
    icon: 'DesignPencil' as IconName,
    persona: 'Creators',
    action: 'Ideas, writing & content creation',
  },
  {
    icon: 'Activity' as IconName,
    persona: 'Researchers',
    action: 'Literature reviews, data & experiments',
  },
  {
    icon: 'Strategy' as IconName,
    persona: 'Managers',
    action: 'Project plans, task lists & operations',
  },
  {
    icon: 'LightBulbOn' as IconName,
    persona: 'Entrepreneurs',
    action: 'Idea testing, strategy & business plans',
  },
] as const

const FAQ_KEYS = [
  {
    q: 'Is my data private?',
    a: 'Yes, 100%. Everything happens in your browser \u2014 we never see, collect, or store any of your data. Your AI keys are encrypted on your device and never sent anywhere.',
  },
  {
    q: 'Which AI providers can I use?',
    a: 'We work with {providers}, plus any service compatible with the OpenAI format. You can switch at any time without losing anything.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'Nope. Just open the website and you\u2019re ready to go. You can add it to your home screen for a native app feel, but it\u2019s totally optional.',
  },
  {
    q: 'Is this really free?',
    a: 'Yes \u2014 {license} licensed, now and forever. All the code is on GitHub. No subscriptions, no premium plans, no paywalls.',
  },
  {
    q: 'Can I use it offline?',
    a: 'After your first visit, everything is saved locally so you can keep working without internet. The only thing that needs a connection is talking to your AI provider.',
  },
  {
    q: 'How does the AI team work?',
    a: 'When you give it a big task, the system breaks it into smaller pieces, picks the best helper for each part, and coordinates them all at once \u2014 like a well-organised project team.',
  },
] as const

// FAQ data moved to FAQ_KEYS above, with template variables for dynamic content

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AboutPage = () => {
  const { t } = useI18n(localI18n)
  const url = useUrl()
  const [activeVideo, setActiveVideo] = useState<TourVideoId>('product')
  const [hasEnteredView, setHasEnteredView] = useState(false)
  const playerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = playerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEnteredView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleVideoEnded = () => {
    if (document.fullscreenElement) return
    const currentIndex = TOUR_VIDEOS.findIndex((v) => v.id === activeVideo)
    const nextIndex = (currentIndex + 1) % TOUR_VIDEOS.length
    setActiveVideo(TOUR_VIDEOS[nextIndex].id)
  }

  const currentVideo =
    TOUR_VIDEOS.find((v) => v.id === activeVideo) ?? TOUR_VIDEOS[0]
  const ActiveVideoComponent = currentVideo.Component

  const providers = LLMService.listProviders()
    .filter((p) => p !== 'custom')
    .join(', ')

  const steps = [
    {
      num: '01',
      title: t('Connect your AI'),
      desc: t(
        'Pick your favourite AI provider \u2014 like OpenAI or Google \u2014 and add your key. Takes about 30 seconds.',
      ),
      url: url(`${location.pathname}${location.search}#settings/providers`),
      icon: 'Settings' as IconName,
    },
    {
      num: '02',
      title: t('Describe what you need'),
      desc: t(
        'Just type what you want done, in plain language. The bigger the challenge, the more it shines.',
      ),
      icon: 'ChatLines' as IconName,
    },
    {
      num: '03',
      title: t('Watch the magic happen'),
      desc: t(
        'Your AI team plans, works, and double-checks in real time. Jump in anytime or sit back and relax.',
      ),
      icon: 'Sparks' as IconName,
    },
    {
      num: '04',
      title: t('Get your results'),
      desc: t(
        'Receive polished deliverables \u2014 documents, code, analyses \u2014 and fine-tune them with simple feedback.',
      ),
      icon: 'CheckCircle' as IconName,
    },
  ]

  return (
    <WorkspaceShell title={t('About')}>
      {/* ================================================================= */}
      {/* HERO — Vision Statement                                           */}
      {/* ================================================================= */}
      <Section mainClassName="rounded-t-xl bg-gradient-to-b from-primary-50/50 via-transparent to-transparent dark:from-primary-900/10">
        <Container>
          <div className="text-center space-y-6 py-4 md:py-8">
            <Title level={1} size="5xl" className="!leading-tight">
              {t('Your AI Team, Ready When You Are')}
            </Title>

            <p className="max-w-2xl mx-auto text-lg text-default-600 leading-relaxed">
              {t(
                '{product} gives you a team of AI helpers that work together \u2014 right in your browser. Just describe what you need, and they\u2019ll plan it, do it, and deliver it \u2014',
                { product: PRODUCT.displayName },
              )}{' '}
              <strong className="text-foreground">
                {t('without your data ever leaving your device')}
              </strong>
              .
            </p>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button
                color="primary"
                variant="flat"
                startContent={<Icon name="PlaySolid" />}
                onPress={() => {
                  const el = document.getElementById('see-it-in-action')
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    history.replaceState(null, '', '#see-it-in-action')
                  }
                }}
              >
                {t('Watch the 30-second tour')}
              </Button>
            </div>

            <Divider className="max-w-xs mx-auto !my-8 opacity-40" />

            <blockquote className="max-w-xl mx-auto italic text-default-500 text-sm leading-relaxed border-l-3 border-primary-300 dark:border-primary-700 pl-4 text-left">
              {t(
                '\u201CAI shouldn\u2019t be a privilege for tech experts. It should be a superpower anyone can use \u2014 like having a brilliant team on call, ready to tackle anything you throw at them.\u201D',
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
              {t('What We Stand For')}
            </Title>
            <p className="text-default-500 text-sm max-w-lg mx-auto">
              {t(
                'Three promises we\u2019ll never break.',
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
              {t('What Makes It Special')}
            </Title>
            <p className="text-default-500 text-sm max-w-lg mx-auto">
              {t(
                'Serious technology made simple \u2014 so you can focus on your ideas.',
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
              {t('How It Works')}
            </Title>
            <p className="text-default-500 text-sm max-w-lg mx-auto">
              {t('From idea to finished result in minutes.')}
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
      {/* SEE IT IN ACTION — Embedded Tour videos                            */}
      {/* ================================================================= */}
      <Section size={7} mainClassName="scroll-mt-16">
        <Container size={7}>
          <div id="see-it-in-action" className="scroll-mt-20" />
          <div className="text-center mb-6">
            <Chip size="sm" variant="flat" color="primary" className="mb-3">
              {t('See it in action')}
            </Chip>
            <Title level={2} className="!mb-1">
              {t('A guided tour, in 30-second clips')}
            </Title>
          </div>

          <div className="flex justify-center mb-5">
            <Tabs
              aria-label={t('See it in action')}
              selectedKey={activeVideo}
              onSelectionChange={(key) => setActiveVideo(key as TourVideoId)}
              variant="solid"
              color="primary"
              classNames={{ base: 'max-w-full', tabList: 'max-w-full' }}
            >
              {TOUR_VIDEOS.map((v) => (
                <Tab
                  key={v.id}
                  title={
                    <div className="flex items-center gap-2">
                      <Icon name={v.icon} className="w-4 h-4" />
                      <span>{t(v.title)}</span>
                    </div>
                  }
                />
              ))}
            </Tabs>
          </div>

          <Card>
            <CardBody className="p-0">
              {/* Light-themed canvas — videos are designed for a bright stage.
                  16:9 on desktop / landscape, flips to 9:16 on mobile portrait
                  so the player fills the viewport instead of leaving a tiny
                  letterboxed strip. */}
              <div
                ref={playerRef}
                className="light bg-white relative w-full aspect-video portrait:max-sm:aspect-[9/14]"
              >
                {hasEnteredView && (
                  <ActiveVideoComponent
                    key={currentVideo.id}
                    rootId={`about-tour-${currentVideo.id}`}
                    autoplay
                    onEnded={handleVideoEnded}
                  />
                )}
              </div>
            </CardBody>
          </Card>
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
              {t('Made for Everyone')}
            </Title>
            <p className="text-default-500 text-sm max-w-lg mx-auto">
              {t(
                'Whether you\u2019re coding, creating, or strategising \u2014 DEVS adapts to you.',
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
                faq.q === 'Which AI providers can I use?'
                  ? { providers }
                  : faq.q === 'Is this really free?'
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
                {t('Join the Movement')}
              </Title>
              <p className="max-w-lg mx-auto text-sm text-default-600 leading-relaxed">
                {t(
                  '{product} is made by people who believe AI should empower everyone, not just the privileged few. Whether you contribute code, ideas, or feedback \u2014 you\u2019re helping make AI accessible to the world.',
                  { product: PRODUCT.displayName },
                )}
              </p>

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button
                  as="a"
                  href="https://github.com/codename-co/devs"
                  target="_blank"
                  rel="noopener noreferrer"
                  color="default"
                  variant="flat"
                  startContent={<Icon name="GitHub" />}
                >
                  {t('View on GitHub')}
                </Button>
                <Button
                  as="a"
                  href="https://github.com/codename-co/devs/issues"
                  target="_blank"
                  rel="noopener noreferrer"
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
    </WorkspaceShell>
  )
}
