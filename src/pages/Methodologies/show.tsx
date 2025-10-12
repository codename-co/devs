import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardBody,
  Chip,
  Spinner,
} from '@heroui/react'

import { Container, Icon, Section, Title, Widget } from '@/components'
import DefaultLayout from '@/layouts/Default'
import { MethodologyMermaidGenerator } from '@/lib/methodology-mermaid-generator'
import { getMethodologyById } from '@/stores/methodologiesStore'
import type { Methodology } from '@/types/methodology.types'
import { useI18n } from '@/i18n'
import { HeaderProps } from '@/lib/types'
import { errorToast } from '@/lib/toast'
import localI18n from './i18n'
import { useMethodologyNavigation } from './useMethodologyNavigation'

export const MethodologyPage = () => {
  const { lang, t, url } = useI18n(localI18n)
  const navigate = useNavigate()
  const params = useParams()
  const methodologyId = params.methodologyId

  const [methodology, setMethodology] = useState<Methodology | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [diagramCode, setDiagramCode] = useState<string>('')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  // Use custom hook for navigation
  const { prevMethodology, nextMethodology } =
    useMethodologyNavigation(methodologyId)

  const name = useMemo(
    () =>
      methodology?.metadata.i18n?.[lang]?.name || methodology?.metadata.name,
    [methodology],
  )
  const description = useMemo(
    () =>
      methodology?.metadata.i18n?.[lang]?.description ||
      methodology?.metadata.description,
    [methodology],
  )
  const title = useMemo(
    () =>
      methodology?.metadata.i18n?.[lang]?.title || methodology?.metadata.title,
    [methodology],
  )
  const longTitle = useMemo(
    () => `${name}${title ? ` (${title})` : ''}`,
    [name, title],
  )

  const header: HeaderProps = {
    color: 'bg-success-50',
    icon: {
      name: 'Strategy',
      color: 'text-success-300',
    },
    title: name,
    subtitle: t('Methodology Details') + (title ? ` · ${title}` : ''),
    cta: {
      label: t('Prompt using this methodology'),
      href: url(
        `#p=${t('Use the {methodology} methodology to complete this task:', { methodology: name })}%0A`,
      ),
      icon: 'ChatPlusIn',
    },
  }

  useEffect(() => {
    const loadMethodologyData = async () => {
      if (!methodologyId) {
        errorToast(t('No methodology ID provided'))
        navigate(url('/methodologies'))
        return
      }

      setIsLoading(true)

      try {
        const data = await getMethodologyById(methodologyId)
        if (!data) {
          errorToast(t('Methodology not found'))
          navigate(url('/methodologies'))
          return
        }

        setMethodology(data)

        // Generate Mermaid diagram
        const generator = new MethodologyMermaidGenerator(data, {
          includeNotes: false,
          includeAgentRoles: true,
          includeArtifacts: true,
          showTaskDetails: false,
        })
        const code = generator.generate()
        setDiagramCode(code)
      } catch (error) {
        console.error('Failed to load methodology:', error)
        errorToast(t('Failed to load methodology'))
        navigate(url('/methodologies'))
      } finally {
        setIsLoading(false)
      }
    }

    loadMethodologyData()
  }, [methodologyId, lang])

  // Handle URL fragment changes to expand accordion items
  useEffect(() => {
    const handleFragmentChange = () => {
      const fragment = window.location.hash.slice(1) // Remove '#'

      if (fragment && fragment.startsWith('phase-')) {
        const phaseId = fragment

        // Update accordion state to expand the matching phase
        setSelectedKeys(new Set([phaseId]))

        // Scroll to the element
        const element = document.getElementById(phaseId)
        element?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        })
      }
    }

    // Handle initial load
    handleFragmentChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleFragmentChange)

    return () => {
      window.removeEventListener('hashchange', handleFragmentChange)
    }
  }, [methodology])

  if (isLoading) {
    return (
      <DefaultLayout title={t('Loading...')} header={header}>
        <Section>
          <Container>
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" />
            </div>
          </Container>
        </Section>
      </DefaultLayout>
    )
  }

  if (!methodology) {
    return null
  }

  return (
    <DefaultLayout title={longTitle} header={header}>
      {/* Graphical Representation */}
      <Section>
        <Container>
          {diagramCode && (
            <Widget
              type="diagram"
              language="mermaid"
              code={diagramCode}
              title={t('Graphical Representation')}
              showTitle={false}
              showActions={false}
              showShadows={false}
            />
          )}
        </Container>
      </Section>

      {/* Metadata */}
      <Section>
        <Container>
          <Title level={2}>{longTitle}</Title>
          {/* <div className="flex items-center gap-2 flex-wrap">
            <Chip size="sm" variant="flat">
              {methodology.metadata.type}
            </Chip>
            {methodology.metadata.complexity && (
              <Chip size="sm" variant="flat">
                {methodology.metadata.complexity}
              </Chip>
            )}
            {methodology.metadata.origin && (
              <Chip size="sm" variant="dot">
                {methodology.metadata.origin}
              </Chip>
            )}
          </div> */}

          {methodology.metadata.description && (
            <p className="text-default-700 text-lg">{description}</p>
          )}

          {methodology.metadata.domains &&
            methodology.metadata.domains.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">{t('Domains')}</h4>
                <div className="flex gap-2 flex-wrap">
                  {methodology.metadata.domains.map((domain) => (
                    <Chip key={domain} size="sm" variant="flat">
                      {domain}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

          {methodology.metadata.tags &&
            methodology.metadata.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">{t('Tags')}</h4>
                <div className="flex gap-2 flex-wrap">
                  {methodology.metadata.tags.map((tag) => (
                    <Chip key={tag} size="sm" variant="dot">
                      {tag}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
        </Container>
      </Section>

      {/* Phases */}
      <Section>
        <Container>
          <Title level={2}>{t('Phases')}</Title>
          <Accordion
            variant="shadow"
            selectedKeys={selectedKeys}
            onSelectionChange={(keys) => setSelectedKeys(keys as Set<string>)}
          >
            {methodology.phases.map((phase, index) => (
              <AccordionItem
                key={`phase-${phase.name.toLowerCase().replace(/\s+/g, '-')}`}
                id={`phase-${phase.name.toLowerCase().replace(/\s+/g, '-')}`}
                aria-label={phase.name}
                title={phase.name}
                subtitle={`${phase.tasks.length} ${
                  phase.tasks.length === 1 ? t('task') : t('tasks')
                }`}
                classNames={{
                  content: 'pl-4',
                }}
                startContent={
                  <span className="text-sm font-mono text-default-400">
                    {index + 1}
                  </span>
                }
              >
                {phase.description && (
                  <div className="mb-4">{phase.description}</div>
                )}

                {phase.optional && (
                  <Chip size="sm" variant="flat" color="warning">
                    {t('Optional')}
                  </Chip>
                )}
                {phase.repeatable && (
                  <Chip size="sm" variant="flat" color="secondary">
                    {t('Repeatable')}
                  </Chip>
                )}

                <ol className="ml-4 list-decimal">
                  {phase.tasks?.map((task) => (
                    <li key={task.id} className="py-2">
                      <h4 className="">{task.title}</h4>
                      <p className="text-sm text-default-600">
                        {task.description}
                      </p>
                    </li>
                  ))}
                </ol>
              </AccordionItem>
            ))}
          </Accordion>
        </Container>
      </Section>

      {/* Agent Coordination */}
      <Section>
        <Container>
          <Title level={2}>{t('Role Distribution')}</Title>
          {methodology.agentCoordination?.roles &&
            methodology.agentCoordination.roles.length > 0 && (
              <div className="space-y-3 gap-3 grid grid-cols-12 grid-rows-2">
                {methodology.agentCoordination.roles.map((role) => (
                  <div
                    key={role.id}
                    className="col-span-12 md:col-span-4 relative group"
                  >
                    <Icon
                      name={role.icon ?? 'Emoji'}
                      size="xl"
                      className="text-default-400 my-2"
                    />
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{role.name}</h4>
                      {role.authority && (
                        <Chip size="sm" variant="flat">
                          {t(role.authority)}
                        </Chip>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-sm text-default-600 mb-2">
                        {role.description}
                      </p>
                    )}
                    {role.responsibilities.length > 0 && (
                      <ul className="text-sm text-default-500 list-disc list-inside">
                        {role.responsibilities.map((resp, i) => (
                          <li key={i}>{resp}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
        </Container>
        <Container className="sticky bottom-0" size={7}>
          <Card fullWidth>
            <CardBody>
              <div className="flex justify-between items-center gap-4">
                <Button
                  color="default"
                  variant="flat"
                  onPress={() =>
                    navigate(
                      prevMethodology
                        ? url(`/methodologies/${prevMethodology.metadata.id}`)
                        : url('/methodologies'),
                    )
                  }
                  startContent={
                    <Icon
                      name="ChevronLeft"
                      size="sm"
                      className="text-default-500"
                    />
                  }
                >
                  {prevMethodology
                    ? t('{methodology} methodology', {
                        methodology:
                          prevMethodology.metadata.i18n?.[lang]?.name ||
                          prevMethodology.metadata.name,
                      })
                    : t('Back to Methodologies')}
                </Button>

                {nextMethodology && (
                  <Button
                    color="default"
                    variant="flat"
                    onPress={() =>
                      navigate(
                        url(`/methodologies/${nextMethodology.metadata.id}`),
                      )
                    }
                    endContent={
                      <Icon
                        name="ChevronRight"
                        size="sm"
                        className="text-default-500"
                      />
                    }
                  >
                    {nextMethodology
                      ? t('{methodology} methodology', {
                          methodology:
                            nextMethodology.metadata.i18n?.[lang]?.name ||
                            nextMethodology.metadata.name,
                        })
                      : t('Next Methodology')}
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </DefaultLayout>
  )
}
