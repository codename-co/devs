import {
  Button,
  Link,
  Card,
  CardBody,
  Chip,
  Accordion,
  AccordionItem,
} from '@heroui/react'
import { Icon } from '@/components/Icon'
import { useI18n } from '@/i18n'
import { IconName } from '@/lib/types'
import { Container } from '@/components'
import { LLMService } from '@/lib/llm'
import pkg from '@/../package.json'

export const AboutPage = () => {
  const { t, url } = useI18n()

  const features: Array<{
    icon: IconName
    title: string
    description: string
  }> = [
    {
      icon: 'Sparks',
      title: t('AI Teams'),
      description: t('Multiple AI agents working together on complex tasks.'),
    },
    {
      icon: 'Brain',
      title: t('LLM Independent'),
      description: t('Works with OpenAI, Anthropic, Google AI, and more'),
    },
    {
      icon: 'PrivacyPolicy',
      title: t('Privacy First'),
      description: t('All data stays on your device. No servers, no tracking.'),
    },
    {
      icon: 'WebWindow',
      title: t('Browser Native'),
      description: t(
        'Works entirely in your browser. No installation required.',
      ),
    },
    {
      icon: 'EvPlugXmark',
      title: t('Offline Ready'),
      description: t('Works without internet after initial load.'),
    },
    {
      icon: 'GitHub',
      title: t('Open Source'),
      description: t(
        'MIT licensed. Built by the community, for the community.',
      ),
    },
  ]

  const useCases = [
    'Research assistance and study planning',
    'Rapid prototyping and code generation',
    'Content creation and brainstorming',
    'Project planning and task breakdown',
    'Data analysis and hypothesis testing',
    'Small business operations management',
  ]

  const how = [
    {
      step: 1,
      name: t('Configure your LLM provider'),
      url: url('/settings'),
      desc: t('Works with OpenAI, Anthropic, Google AI, and more'),
    },
    {
      step: 2,
      name: t('Describe your task'),
      desc: t('Be as detailed as possible to get the best results'),
    },
    {
      step: 3,
      name: t('Watch AI agents collaborate'),
      desc: t('See how different agents work together to complete your task'),
    },
    {
      step: 4,
      name: t('Guide when needed'),
      desc: t('Provide feedback and guidance to the agents as they work'),
    },
  ]

  return (
    <Container>
      <Accordion selectionMode="single" defaultSelectedKeys={['vision']}>
        <AccordionItem key="vision" title={t('Our Vision')}>
          <p className="text-default-700">
            {t(
              "Democratize AI agent delegation with a universally accessible, privacy-conscious, open-source solution that runs entirely in the browser. AI augmentation isn't a luxury for the few, but a fundamental tool available to all.",
            )}
          </p>
        </AccordionItem>

        <AccordionItem key="features" title={t('Key Features')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <Card key={index}>
                <CardBody className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-100">
                      <Icon
                        name={feature.icon}
                        className="w-4 h-4 text-primary-600"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">
                        {feature.title}
                      </h4>
                      <p className="text-xs text-default-600">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </AccordionItem>

        <AccordionItem key="key-benefits" title={t('Key Benefits')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {useCases.map((useCase, index) => (
              <div key={index} className="flex items-center gap-2">
                <Icon
                  name="CheckCircle"
                  className="w-4 h-4 text-success-500 flex-shrink-0"
                />
                <span className="text-sm text-default-700">{useCase}</span>
              </div>
            ))}
          </div>
        </AccordionItem>

        <AccordionItem key="how" title={t('How It Works')}>
          <div className="space-y-3">
            {how.map(({ step, name, url, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <Chip size="sm" variant="flat" color="primary">
                  {step}
                </Chip>
                <div className="flex-1">
                  <p className="text-sm text-default-700">
                    <strong>
                      {url ? (
                        <Link size="sm" href={url}>
                          {name}
                        </Link>
                      ) : (
                        name
                      )}
                    </strong>
                    &nbsp;-&nbsp;{desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </AccordionItem>

        <AccordionItem key="faq" title={t('FAQ')}>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-1">
                {t('Is my data private?')}
              </h4>
              <p className="text-xs text-default-600">
                {t(
                  'Yes! All data processing happens locally in your browser. We do not collect or store any of your data.',
                )}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">
                {t('Which LLM providers are supported?')}
              </h4>
              <p className="text-xs text-default-600">
                {t(
                  'We support {llmList}, and any provider compatible with the OpenAI API spec.',
                  {
                    llmList: LLMService.listProviders()
                      .filter((p) => p !== 'custom')
                      .join(', '),
                  },
                )}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">
                {t('Do I need to install anything?')}
              </h4>
              <p className="text-xs text-default-600">
                {t(
                  'No installation is required. The app runs entirely in your web browser.',
                )}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">
                {t('Is this open source?')}
              </h4>
              <p className="text-xs text-default-600">
                {t(
                  'Yes! The project is open source and available on GitHub under the {license} license.',
                  { license: pkg.license },
                )}
              </p>
              <p className="mt-2">
                <Button
                  as={Link}
                  size="sm"
                  href="https://github.com/codename-co/devs"
                  target="_blank"
                  isExternal
                  variant="flat"
                  startContent={<Icon name="GitHub" />}
                >
                  {t('View on GitHub')}
                </Button>
              </p>
            </div>
          </div>
        </AccordionItem>
      </Accordion>
    </Container>
  )
}
