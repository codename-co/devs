import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardBody,
  Chip,
  Link,
  Navbar,
  NavbarContent,
  NavbarItem,
  Spinner,
  Tab,
  Tabs,
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
import { formatDuration } from '@/lib/format'

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
    title: t('{methodology} methodology', { methodology: name }),
    subtitle: title ?? t('Methodology Details'),
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

        if (data.metadata.diagram) {
          setDiagramCode(data.metadata.diagram)
        } else {
          // Generate Mermaid diagram
          const generator = new MethodologyMermaidGenerator(data, {
            includeNotes: false,
            includeAgentRoles: true,
            includeArtifacts: true,
            showTaskDetails: false,
          })
          const code = generator.generate()
          setDiagramCode(code)
        }
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
      {/* Metadata */}
      <Section>
        <Container>
          {/* <Title level={2}>{longTitle}</Title> */}

          <div className="flex items-center gap-2 flex-wrap mb-4">
            <Chip size="sm" variant="flat" color="primary">
              {t(methodology.metadata.type)}
            </Chip>
            {methodology.metadata.complexity && (
              <Chip size="sm" variant="flat" color="secondary">
                {t(methodology.metadata.complexity)}
              </Chip>
            )}
            {methodology.metadata.version && (
              <Chip size="sm" variant="dot" color="default">
                v{methodology.metadata.version}
              </Chip>
            )}
            {methodology.metadata.origin && (
              <Chip size="sm" variant="dot" color="warning">
                {methodology.metadata.origin}
              </Chip>
            )}
          </div>

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

      <Tabs
        aria-label="Methodology sections"
        variant="underlined"
        // color="primary
        classNames={{
          base: 'flex place-self-center w-full max-w-4xl -mb-3',
          tab: 'py-6',
          tabList: 'gap-6 w-full relative rounded-none py-0',
        }}
      >
        {/* Overview Tab */}
        <Tab key="overview" title={t('Overview')}>
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
                  className="max-h-240"
                />
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
                onSelectionChange={(keys) =>
                  setSelectedKeys(keys as Set<string>)
                }
              >
                {methodology.phases.map((phase, index) => (
                  <AccordionItem
                    key={`phase-${index}-${phase.name.toLowerCase().replace(/\s+/g, '-')}`}
                    id={`phase-${index}-${phase.name.toLowerCase().replace(/\s+/g, '-')}`}
                    aria-label={phase.name}
                    title={phase.name}
                    subtitle={`${phase.tasks.length} ${
                      phase.tasks.length === 1 ? t('task') : t('tasks')
                    }`}
                    classNames={{
                      content: 'pl-4',
                    }}
                    startContent={
                      <span className="text-sm font-mono text-default-400 mx-4">
                        {index + 1}
                      </span>
                    }
                  >
                    {phase.description && (
                      <div className="mb-4">{phase.description}</div>
                    )}

                    {/* Tasks */}
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-default-500 mb-2">
                        {t('tasks')}:
                      </p>
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
                    </div>

                    <div className="flex gap-2 flex-wrap mb-4">
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
                      {phase.parallelizable && (
                        <Chip size="sm" variant="flat" color="primary">
                          {t('Parallelizable')}
                        </Chip>
                      )}
                    </div>

                    {/* Phase Duration */}
                    {phase.duration && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-default-500 mb-1">
                          {t('Phase Duration')}:
                        </p>
                        <div className="flex gap-2">
                          {phase.duration.estimated && (
                            <Chip size="sm" variant="flat">
                              {t('Estimated')}:{' '}
                              {formatDuration(
                                phase.duration.estimated * 60,
                                lang,
                              )}
                            </Chip>
                          )}
                          {phase.duration.min && (
                            <Chip size="sm" variant="dot">
                              {t('Minimum')}:{' '}
                              {formatDuration(phase.duration.min * 60, lang)}
                            </Chip>
                          )}
                          {phase.duration.max && (
                            <Chip size="sm" variant="dot">
                              {t('Maximum')}:{' '}
                              {formatDuration(phase.duration.max * 60, lang)}
                            </Chip>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Entry Criteria */}
                    {phase.entryCriteria && phase.entryCriteria.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-default-500 mb-1">
                          {t('Entry Criteria')}:
                        </p>
                        <ul className="text-sm text-default-600 list-disc list-inside">
                          {phase.entryCriteria.map((criterion, i) => (
                            <li key={i}>
                              {criterion.description || criterion.type}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Exit Criteria */}
                    {phase.exitCriteria && phase.exitCriteria.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-default-500 mb-1">
                          {t('Exit Criteria')}:
                        </p>
                        <ul className="text-sm text-default-600 list-disc list-inside">
                          {phase.exitCriteria.map((criterion, i) => (
                            <li key={i}>
                              {criterion.description || criterion.type}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Agent Requirements */}
                    {phase.agentRequirements && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-default-500 mb-2">
                          {t('Agent Requirements')}:
                        </p>
                        <div className="space-y-2">
                          {phase.agentRequirements.roles &&
                            phase.agentRequirements.roles.length > 0 && (
                              <div>
                                <p className="text-xs text-default-500">
                                  {t('Roles')}:
                                </p>
                                <div className="flex gap-1 flex-wrap">
                                  {phase.agentRequirements.roles.map(
                                    (roleId) => {
                                      const role =
                                        methodology.agentCoordination?.roles?.find(
                                          (r) => r.id === roleId,
                                        )
                                      return (
                                        <Chip
                                          key={roleId}
                                          size="sm"
                                          variant="flat"
                                        >
                                          {role?.name || roleId}
                                        </Chip>
                                      )
                                    },
                                  )}
                                </div>
                              </div>
                            )}
                          {phase.agentRequirements.skills &&
                            phase.agentRequirements.skills.length > 0 && (
                              <div>
                                <p className="text-xs text-default-500">
                                  {t('Skills')}:
                                </p>
                                <div className="flex gap-1 flex-wrap">
                                  {phase.agentRequirements.skills.map(
                                    (skill) => (
                                      <Chip key={skill} size="sm" variant="dot">
                                        {skill}
                                      </Chip>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                          {phase.agentRequirements.minExperience && (
                            <div>
                              <p className="text-xs text-default-500">
                                {t('Min Experience')}:{' '}
                                <Chip
                                  size="sm"
                                  variant="flat"
                                  color="secondary"
                                >
                                  {t(phase.agentRequirements.minExperience)}
                                </Chip>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Phase Artifacts */}
                    {phase.artifacts &&
                      ((phase.artifacts.inputs?.length ?? 0) > 0 ||
                        (phase.artifacts.outputs?.length ?? 0) > 0) && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-default-500 mb-2">
                            {t('Phase Artifacts')}:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {phase.artifacts.inputs &&
                              phase.artifacts.inputs.length > 0 && (
                                <div>
                                  <p className="text-xs text-default-500 mb-1">
                                    {t('Inputs')}:
                                  </p>
                                  <div className="flex gap-1 flex-wrap">
                                    {phase.artifacts.inputs.map((input) => (
                                      <Chip
                                        key={input.typeId}
                                        size="sm"
                                        variant="flat"
                                      >
                                        {methodology.artifactFlow?.artifactTypes?.find(
                                          (a) => a.id === input.typeId,
                                        )?.name || input.typeId}
                                      </Chip>
                                    ))}
                                  </div>
                                </div>
                              )}
                            {phase.artifacts.outputs &&
                              phase.artifacts.outputs.length > 0 && (
                                <div>
                                  <p className="text-xs text-default-500 mb-1">
                                    {t('Outputs')}:
                                  </p>
                                  <div className="flex gap-1 flex-wrap">
                                    {phase.artifacts.outputs.map((output) => (
                                      <Chip
                                        key={output.typeId}
                                        size="sm"
                                        variant="flat"
                                        color="success"
                                      >
                                        {methodology.artifactFlow?.artifactTypes?.find(
                                          (a) => a.id === output.typeId,
                                        )?.name || output.typeId}
                                      </Chip>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                  </AccordionItem>
                ))}
              </Accordion>
            </Container>
          </Section>
        </Tab>

        {Boolean(methodology.agentCoordination?.roles?.length) && (
          <Tab key="roles" title={t('Roles')}>
            {/* Agent Coordination */}
            <Section>
              <Container>
                <Title level={2}>{t('Role Distribution')}</Title>
                {methodology.agentCoordination?.roles &&
                  methodology.agentCoordination.roles.length > 0 && (
                    <div className="space-y-3 gap-3 grid grid-cols-12 grid-rows-2">
                      {methodology.agentCoordination.roles.map((role) => {
                        const isRequired =
                          methodology.agentCoordination?.teamComposition?.required?.includes(
                            role.id,
                          ) ?? false

                        return (
                          <div
                            key={role.id}
                            className="col-span-12 md:col-span-4 relative group"
                          >
                            <Icon
                              name={role.icon ?? 'Emoji'}
                              size="xl"
                              className="text-default-400 my-2"
                            />
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-semibold">{role.name}</h4>
                              {role.authority && (
                                <Chip size="sm" variant="flat">
                                  {t(role.authority)}
                                </Chip>
                              )}
                              {role.experienceLevel && (
                                <Chip
                                  size="sm"
                                  variant="flat"
                                  color="secondary"
                                >
                                  {t(role.experienceLevel)}
                                </Chip>
                              )}
                              {isRequired && (
                                <Chip size="sm" variant="flat" color="danger">
                                  {t('Required')}
                                </Chip>
                              )}
                            </div>
                            {role.description && (
                              <p className="text-sm text-default-600 mb-2">
                                {role.description}
                              </p>
                            )}
                            {role.responsibilities.length > 0 && (
                              <div className="mb-2">
                                <p className="text-xs font-semibold text-default-500 mb-1">
                                  {t('Responsibilities')}:
                                </p>
                                <ul className="text-sm text-default-500 list-disc list-inside">
                                  {role.responsibilities.map((resp, i) => (
                                    <li key={i}>{resp}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {role.requiredSkills &&
                              role.requiredSkills.length > 0 && (
                                <div className="mb-2">
                                  <p className="text-xs font-semibold text-default-500 mb-1">
                                    {t('Required Skills')}:
                                  </p>
                                  <div className="flex gap-1 flex-wrap">
                                    {role.requiredSkills.map((skill) => (
                                      <Chip
                                        key={skill}
                                        size="sm"
                                        variant="flat"
                                        color="success"
                                      >
                                        {skill}
                                      </Chip>
                                    ))}
                                  </div>
                                </div>
                              )}
                            {role.optionalSkills &&
                              role.optionalSkills.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-default-500 mb-1">
                                    {t('Optional Skills')}:
                                  </p>
                                  <div className="flex gap-1 flex-wrap">
                                    {role.optionalSkills.map((skill) => (
                                      <Chip key={skill} size="sm" variant="dot">
                                        {skill}
                                      </Chip>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>
                        )
                      })}
                    </div>
                  )}
              </Container>
            </Section>

            {/* Team Composition */}
            {methodology.agentCoordination?.teamComposition && (
              <Section>
                <Container>
                  <Title level={2}>{t('Team Composition')}</Title>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {methodology.agentCoordination.teamComposition.minSize && (
                      <Card>
                        <CardBody>
                          <p className="text-sm text-default-600">
                            {t('Minimum team size')}
                          </p>
                          <p className="text-2xl font-semibold">
                            {
                              methodology.agentCoordination.teamComposition
                                .minSize
                            }
                          </p>
                        </CardBody>
                      </Card>
                    )}
                    {methodology.agentCoordination.teamComposition.maxSize && (
                      <Card>
                        <CardBody>
                          <p className="text-sm text-default-600">
                            {t('Maximum team size')}
                          </p>
                          <p className="text-2xl font-semibold">
                            {
                              methodology.agentCoordination.teamComposition
                                .maxSize
                            }
                          </p>
                        </CardBody>
                      </Card>
                    )}
                  </div>
                </Container>
              </Section>
            )}

            {/* Communication Patterns */}
            {methodology.agentCoordination?.communicationPatterns &&
              methodology.agentCoordination.communicationPatterns.length >
                0 && (
                <Section>
                  <Container>
                    <Title level={2}>{t('Communication Patterns')}</Title>
                    <div className="space-y-3">
                      {methodology.agentCoordination.communicationPatterns.map(
                        (pattern, index) => {
                          // Find role names from IDs
                          const fromRole =
                            methodology.agentCoordination?.roles?.find(
                              (r) => r.id === pattern.from,
                            )
                          const toRole =
                            methodology.agentCoordination?.roles?.find(
                              (r) => r.id === pattern.to,
                            )

                          return (
                            <Card key={index}>
                              <CardBody>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-sm text-default-600">
                                      {t('From')}
                                    </p>
                                    <p className="font-semibold">
                                      {fromRole?.name || pattern.from}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-default-600">
                                      {t('To')}
                                    </p>
                                    <p className="font-semibold">
                                      {toRole?.name || pattern.to}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-default-600">
                                      {t('Type')}
                                    </p>
                                    <Chip size="sm" variant="flat">
                                      {t(pattern.type)}
                                    </Chip>
                                  </div>
                                </div>
                                {pattern.contextTypes &&
                                  pattern.contextTypes.length > 0 && (
                                    <div className="mt-3">
                                      <p className="text-sm text-default-600 mb-2">
                                        {t('Context types')}
                                      </p>
                                      <div className="flex gap-2 flex-wrap">
                                        {pattern.contextTypes.map((type) => (
                                          <Chip
                                            key={type}
                                            size="sm"
                                            variant="dot"
                                          >
                                            {t(type)}
                                          </Chip>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                              </CardBody>
                            </Card>
                          )
                        },
                      )}
                    </div>
                  </Container>
                </Section>
              )}

            {/* Decision Authority */}
            {methodology.agentCoordination?.decisionAuthority &&
              methodology.agentCoordination.decisionAuthority.length > 0 && (
                <Section>
                  <Container>
                    <Title level={2}>{t('Decision Authority')}</Title>
                    <div className="space-y-3">
                      {methodology.agentCoordination.decisionAuthority.map(
                        (decision, index) => {
                          // Find authority role name
                          const authorityRole =
                            methodology.agentCoordination?.roles?.find(
                              (r) => r.id === decision.authority,
                            )

                          return (
                            <Card key={index}>
                              <CardBody>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-default-600">
                                      {t('Decision')}
                                    </p>
                                    <p className="font-semibold">
                                      {decision.decision}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-default-600">
                                      {t('Authority')}
                                    </p>
                                    <Chip
                                      size="sm"
                                      variant="flat"
                                      color="primary"
                                    >
                                      {authorityRole?.name ||
                                        decision.authority}
                                    </Chip>
                                  </div>
                                </div>
                                <div className="mt-3 flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm text-default-600">
                                      {t('Requires consensus')}:
                                    </p>
                                    <Chip
                                      size="sm"
                                      variant="flat"
                                      color={
                                        decision.requiresConsensus
                                          ? 'success'
                                          : 'default'
                                      }
                                    >
                                      {decision.requiresConsensus
                                        ? t('Yes')
                                        : t('No')}
                                    </Chip>
                                  </div>
                                  {decision.consensusRoles &&
                                    decision.consensusRoles.length > 0 && (
                                      <div>
                                        <p className="text-sm text-default-600 inline mr-2">
                                          {t('Consensus roles')}:
                                        </p>
                                        {decision.consensusRoles.map(
                                          (roleId) => {
                                            const role =
                                              methodology.agentCoordination?.roles?.find(
                                                (r) => r.id === roleId,
                                              )
                                            return (
                                              <Chip
                                                key={roleId}
                                                size="sm"
                                                variant="dot"
                                                className="mr-1"
                                              >
                                                {role?.name || roleId}
                                              </Chip>
                                            )
                                          },
                                        )}
                                      </div>
                                    )}
                                </div>
                              </CardBody>
                            </Card>
                          )
                        },
                      )}
                    </div>
                  </Container>
                </Section>
              )}
          </Tab>
        )}

        <Tab key="details" title={t('Details')}>
          {/* Configuration */}
          {methodology.configuration && (
            <Section>
              <Container>
                <Title level={2}>{t('Configuration')}</Title>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {methodology.configuration.maxIterations && (
                    <Card>
                      <CardBody>
                        <p className="text-sm text-default-600">
                          {t('Maximum Iterations')}
                        </p>
                        <p className="text-2xl font-semibold">
                          {methodology.configuration.maxIterations}
                        </p>
                      </CardBody>
                    </Card>
                  )}

                  {methodology.configuration.timeBox && (
                    <Card>
                      <CardBody>
                        <p className="text-sm text-default-600 mb-2">
                          {t('Time Box')}
                        </p>
                        <div className="space-y-1">
                          <p className="text-lg font-semibold">
                            {methodology.configuration.timeBox.duration}{' '}
                            {t(methodology.configuration.timeBox.unit as any)}
                          </p>
                          {methodology.configuration.timeBox.strict !==
                            undefined && (
                            <Chip
                              size="sm"
                              variant="flat"
                              color={
                                methodology.configuration.timeBox.strict
                                  ? 'warning'
                                  : 'default'
                              }
                            >
                              {methodology.configuration.timeBox.strict
                                ? t('Strict')
                                : t('Flexible')}
                            </Chip>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  )}

                  {methodology.configuration.qualityGates && (
                    <Card>
                      <CardBody>
                        <p className="text-sm text-default-600 mb-2">
                          {t('Quality Gates')}
                        </p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Chip
                              size="sm"
                              variant="flat"
                              color={
                                methodology.configuration.qualityGates.enabled
                                  ? 'success'
                                  : 'default'
                              }
                            >
                              {methodology.configuration.qualityGates.enabled
                                ? t('Enabled')
                                : t('Disabled')}
                            </Chip>
                          </div>
                          {methodology.configuration.qualityGates.autoRetry !==
                            undefined && (
                            <p className="text-sm text-default-500">
                              {t('Auto Retry')}:{' '}
                              {methodology.configuration.qualityGates.autoRetry
                                ? t('Yes')
                                : t('No')}
                            </p>
                          )}
                          {methodology.configuration.qualityGates.maxRetries !==
                            undefined && (
                            <p className="text-sm text-default-500">
                              {t('Max Retries')}:{' '}
                              {
                                methodology.configuration.qualityGates
                                  .maxRetries
                              }
                            </p>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  )}

                  {methodology.configuration.parallelization && (
                    <Card>
                      <CardBody>
                        <p className="text-sm text-default-600 mb-2">
                          {t('Parallelization')}
                        </p>
                        <div className="space-y-1">
                          <Chip
                            size="sm"
                            variant="flat"
                            color={
                              methodology.configuration.parallelization.enabled
                                ? 'success'
                                : 'default'
                            }
                          >
                            {methodology.configuration.parallelization.enabled
                              ? t('Enabled')
                              : t('Disabled')}
                          </Chip>
                          {methodology.configuration.parallelization
                            .maxConcurrentTasks !== undefined && (
                            <p className="text-sm text-default-500">
                              {t('Max Concurrent Tasks')}:{' '}
                              {
                                methodology.configuration.parallelization
                                  .maxConcurrentTasks
                              }
                            </p>
                          )}
                          {methodology.configuration.parallelization
                            .maxConcurrentAgents !== undefined && (
                            <p className="text-sm text-default-500">
                              {t('Max Concurrent Agents')}:{' '}
                              {
                                methodology.configuration.parallelization
                                  .maxConcurrentAgents
                              }
                            </p>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  )}

                  {methodology.configuration.convergence && (
                    <Card>
                      <CardBody>
                        <p className="text-sm text-default-600 mb-2">
                          {t('Convergence')}
                        </p>
                        <div className="space-y-1">
                          {methodology.configuration.convergence.metric && (
                            <p className="text-sm text-default-500">
                              {t('Metric')}:{' '}
                              {methodology.configuration.convergence.metric}
                            </p>
                          )}
                          {methodology.configuration.convergence.threshold !==
                            undefined && (
                            <p className="text-sm text-default-500">
                              {t('Threshold')}:{' '}
                              {methodology.configuration.convergence.threshold}
                            </p>
                          )}
                          {methodology.configuration.convergence.operator && (
                            <p className="text-sm text-default-500">
                              {t('Operator')}:{' '}
                              {methodology.configuration.convergence.operator}
                            </p>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  )}
                </div>
              </Container>
            </Section>
          )}

          {/* Execution Strategy */}
          {methodology.execution && (
            <Section>
              <Container>
                <Title level={2}>{t('Execution Strategy')}</Title>
                <div className="space-y-4">
                  <Card>
                    <CardBody>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-default-600">
                            {t('Strategy')}
                          </p>
                          <Chip size="sm" variant="flat" color="primary">
                            {t(methodology.execution.strategy)}
                          </Chip>
                        </div>
                        {methodology.execution.failureHandling && (
                          <div>
                            <p className="text-sm text-default-600">
                              {t('Failure Handling')}
                            </p>
                            <Chip size="sm" variant="flat" color="warning">
                              {t(
                                methodology.execution.failureHandling.strategy,
                              )}
                            </Chip>
                            {methodology.execution.failureHandling
                              .fallbackPhase && (
                              <p className="text-xs text-default-500 mt-1">
                                {t('Fallback Phase')}:{' '}
                                {
                                  methodology.execution.failureHandling
                                    .fallbackPhase
                                }
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </CardBody>
                  </Card>

                  {methodology.execution.phaseOrder &&
                    methodology.execution.phaseOrder.length > 0 && (
                      <Card>
                        <CardBody>
                          <p className="text-sm text-default-600 mb-2">
                            {t('Phase Order')}
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {methodology.execution.phaseOrder.map(
                              (phaseId, index) => {
                                const phase = methodology.phases.find(
                                  (p) => p.id === phaseId,
                                )
                                return (
                                  <Chip key={phaseId} size="sm" variant="flat">
                                    {index + 1}. {phase?.name || phaseId}
                                  </Chip>
                                )
                              },
                            )}
                          </div>
                        </CardBody>
                      </Card>
                    )}

                  {methodology.execution.loops &&
                    methodology.execution.loops.length > 0 && (
                      <Card>
                        <CardBody>
                          <p className="text-sm text-default-600 mb-3">
                            {t('Loops')}
                          </p>
                          <div className="space-y-3">
                            {methodology.execution.loops.map((loop) => (
                              <div
                                key={loop.id}
                                className="border-l-2 border-secondary pl-3"
                              >
                                <h4 className="font-semibold">
                                  {loop.name || loop.id}
                                </h4>
                                {loop.description && (
                                  <p className="text-sm text-default-600">
                                    {loop.description}
                                  </p>
                                )}
                                {loop.maxIterations && (
                                  <p className="text-xs text-default-500 mt-1">
                                    {t('Max Iterations')}: {loop.maxIterations}
                                  </p>
                                )}
                                <div className="flex gap-1 flex-wrap mt-2">
                                  {loop.phases.map((phaseId) => {
                                    const phase = methodology.phases.find(
                                      (p) => p.id === phaseId,
                                    )
                                    return (
                                      <Chip
                                        key={phaseId}
                                        size="sm"
                                        variant="dot"
                                      >
                                        {phase?.name || phaseId}
                                      </Chip>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardBody>
                      </Card>
                    )}

                  {methodology.execution.branches &&
                    methodology.execution.branches.length > 0 && (
                      <Card>
                        <CardBody>
                          <p className="text-sm text-default-600 mb-3">
                            {t('Branches')}
                          </p>
                          <div className="space-y-3">
                            {methodology.execution.branches.map(
                              (branch, index) => (
                                <div
                                  key={branch.id || index}
                                  className="border-l-2 border-warning pl-3"
                                >
                                  <h4 className="font-semibold text-sm">
                                    {t('Condition')}
                                  </h4>
                                  <p className="text-sm text-default-600 mb-2">
                                    {branch.condition.description ||
                                      branch.condition.type}
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <p className="text-xs text-default-500">
                                        {t('True Phase')}:
                                      </p>
                                      <Chip
                                        size="sm"
                                        variant="flat"
                                        color="success"
                                      >
                                        {methodology.phases.find(
                                          (p) => p.id === branch.truePhase,
                                        )?.name || branch.truePhase}
                                      </Chip>
                                    </div>
                                    <div>
                                      <p className="text-xs text-default-500">
                                        {t('False Phase')}:
                                      </p>
                                      <Chip
                                        size="sm"
                                        variant="flat"
                                        color="danger"
                                      >
                                        {methodology.phases.find(
                                          (p) => p.id === branch.falsePhase,
                                        )?.name || branch.falsePhase}
                                      </Chip>
                                    </div>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </CardBody>
                      </Card>
                    )}
                </div>
              </Container>
            </Section>
          )}

          {/* Artifact Flow */}
          {methodology.artifactFlow &&
            methodology.artifactFlow.artifactTypes &&
            methodology.artifactFlow.artifactTypes.length > 0 && (
              <Section>
                <Container>
                  <Title level={2}>{t('Artifact Flow')}</Title>
                  <Widget
                    type="diagram"
                    language="mermaid"
                    code={(() => {
                      const artifacts =
                        methodology.artifactFlow.artifactTypes || []
                      const dependencies =
                        methodology.artifactFlow.dependencies || []

                      // Start mermaid flowchart
                      let diagram = 'graph TD\n'

                      // Add all artifacts as nodes
                      artifacts.forEach((artifact) => {
                        const nodeId = artifact.id.replace(/[^a-zA-Z0-9]/g, '_')
                        diagram += `  ${nodeId}["${artifact.name}"]\n`
                      })

                      // Add dependencies as edges
                      dependencies.forEach((dep) => {
                        const targetId = dep.artifact.replace(
                          /[^a-zA-Z0-9]/g,
                          '_',
                        )
                        dep.dependsOn.forEach((sourceId: string) => {
                          const cleanSourceId = sourceId.replace(
                            /[^a-zA-Z0-9]/g,
                            '_',
                          )
                          diagram += `  ${cleanSourceId} --> ${targetId}\n`
                        })
                      })

                      // If no dependencies, show artifacts in sequence
                      if (dependencies.length === 0 && artifacts.length > 1) {
                        for (let i = 0; i < artifacts.length - 1; i++) {
                          const currentId = artifacts[i].id.replace(
                            /[^a-zA-Z0-9]/g,
                            '_',
                          )
                          const nextId = artifacts[i + 1].id.replace(
                            /[^a-zA-Z0-9]/g,
                            '_',
                          )
                          diagram += `  ${currentId} -.-> ${nextId}\n`
                        }
                      }

                      return diagram
                    })()}
                    showTitle={false}
                    showActions={false}
                    showShadows={false}
                  />
                </Container>
              </Section>
            )}

          {/* Artifact Types Details */}
          {methodology.artifactFlow?.artifactTypes &&
            methodology.artifactFlow.artifactTypes.length > 0 && (
              <Section>
                <Container>
                  <Title level={2}>{t('Artifact Types')}</Title>
                  <div className="space-y-3 columns-1 md:columns-2 lg:columns-3">
                    {methodology.artifactFlow.artifactTypes.map(
                      (artifactType) => (
                        <Card key={artifactType.id}>
                          <CardBody>
                            <div className="mb-3">
                              <h4 className="font-semibold text-lg">
                                {artifactType.name}
                              </h4>
                              {artifactType.description && (
                                <p className="text-sm text-default-600 mt-1">
                                  {artifactType.description}
                                </p>
                              )}
                            </div>

                            <div className="flex gap-2 mb-3">
                              <Chip size="sm" variant="flat" color="primary">
                                {t('Format')}: {t(artifactType.format)}
                              </Chip>
                            </div>

                            {artifactType.validationRules &&
                              artifactType.validationRules.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs font-semibold text-default-500 mb-2">
                                    {t('Validation Rules')}:
                                  </p>
                                  <div className="space-y-2">
                                    {artifactType.validationRules.map(
                                      (validationRule, index) => (
                                        <div
                                          key={index}
                                          className="border-l-2 border-warning pl-3"
                                        >
                                          <p className="text-sm text-default-700">
                                            {validationRule.rule}
                                          </p>
                                          {validationRule.errorMessage && (
                                            <p className="text-xs text-danger mt-1">
                                              {t('Error Message')}:{' '}
                                              {validationRule.errorMessage}
                                            </p>
                                          )}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}

                            {artifactType.templates &&
                              artifactType.templates.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-default-500 mb-2">
                                    {t('Templates')}:
                                  </p>
                                  <div className="space-y-2">
                                    {artifactType.templates.map(
                                      (template, index) => (
                                        <div
                                          key={index}
                                          className="bg-default-100 rounded-lg p-3"
                                        >
                                          <p className="text-sm font-semibold text-default-700 mb-1">
                                            {template.name}
                                          </p>
                                          <pre className="text-xs text-default-600 whitespace-pre-wrap font-mono">
                                            {template.content}
                                          </pre>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}
                          </CardBody>
                        </Card>
                      ),
                    )}
                  </div>
                </Container>
              </Section>
            )}
        </Tab>

        {/* Ceremonies */}
        {methodology.ceremonies && methodology.ceremonies.length > 0 && (
          <Tab key="ceremonies" title={t('Ceremonies')}>
            <Section>
              <Container>
                <Title level={2}>{t('Ceremonies')}</Title>
                <div className="space-y-3">
                  {methodology.ceremonies.map((ceremony) => (
                    <Card key={ceremony.id}>
                      <CardBody>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">
                              {ceremony.name}
                            </h4>
                            {ceremony.description && (
                              <p className="text-sm text-default-600 mt-1">
                                {ceremony.description}
                              </p>
                            )}
                          </div>
                          {ceremony.duration && (
                            <Chip size="sm" variant="flat">
                              {formatDuration(ceremony.duration * 60, lang)}
                            </Chip>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-default-600 mb-1">
                              {t('Timing')}
                            </p>
                            <Chip size="sm" variant="flat">
                              {t(ceremony.timing)}
                            </Chip>
                          </div>
                          {ceremony.participants &&
                            ceremony.participants.length > 0 && (
                              <div>
                                <p className="text-sm text-default-600 mb-1">
                                  {t('Participants')}
                                </p>
                                <div className="flex gap-1 flex-wrap">
                                  {ceremony.participants.map(
                                    (participantId) => {
                                      const role =
                                        methodology.agentCoordination?.roles?.find(
                                          (r) => r.id === participantId,
                                        )
                                      return (
                                        <Chip
                                          key={participantId}
                                          size="sm"
                                          variant="dot"
                                        >
                                          {role?.name || participantId}
                                        </Chip>
                                      )
                                    },
                                  )}
                                </div>
                              </div>
                            )}
                        </div>

                        {ceremony.objectives &&
                          ceremony.objectives.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm text-default-600 mb-1">
                                {t('Objectives')}
                              </p>
                              <ul className="text-sm text-default-700 list-disc list-inside">
                                {ceremony.objectives.map((objective, i) => (
                                  <li key={i}>{objective}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {ceremony.artifacts && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {ceremony.artifacts.inputs &&
                              ceremony.artifacts.inputs.length > 0 && (
                                <div>
                                  <p className="text-sm text-default-600 mb-1">
                                    {t('Inputs')}
                                  </p>
                                  <div className="flex gap-1 flex-wrap">
                                    {ceremony.artifacts.inputs.map((input) => (
                                      <Chip
                                        key={input}
                                        size="sm"
                                        variant="flat"
                                      >
                                        {input}
                                      </Chip>
                                    ))}
                                  </div>
                                </div>
                              )}
                            {ceremony.artifacts.outputs &&
                              ceremony.artifacts.outputs.length > 0 && (
                                <div>
                                  <p className="text-sm text-default-600 mb-1">
                                    {t('Outputs')}
                                  </p>
                                  <div className="flex gap-1 flex-wrap">
                                    {ceremony.artifacts.outputs.map(
                                      (output) => (
                                        <Chip
                                          key={output}
                                          size="sm"
                                          variant="flat"
                                        >
                                          {output}
                                        </Chip>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </Container>
            </Section>
          </Tab>
        )}

        <Tab key="code" title="API">
          <Section>
            <Container>
              {/* <Title level={2}>{t('JSON Methodology')}</Title> */}
              <Button
                as={Link}
                variant="flat"
                startContent={<Icon name="Download" size="sm" />}
                href={`/methodologies/${methodology.metadata.id}.methodology.json`}
                target="_blank"
              >
                {t('Download')}
              </Button>
              <Widget
                type="generic"
                language="json"
                code={JSON.stringify(methodology, null, 2)}
              />
            </Container>
          </Section>
        </Tab>
      </Tabs>

      {/* Bottom Navigation Bar */}
      <Navbar
        position="static"
        className="bottom-0 top-auto"
        classNames={{
          wrapper: 'max-w-5xl',
        }}
        isBordered
        isBlurred
      >
        <NavbarContent justify="start">
          <NavbarItem>
            <Button
              variant="flat"
              startContent={
                <Icon
                  name="NavArrowLeft"
                  size="sm"
                  className="text-default-500"
                />
              }
              onPress={() =>
                navigate(
                  prevMethodology
                    ? url(`/methodologies/${prevMethodology.metadata.id}`)
                    : url('/methodologies'),
                )
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
          </NavbarItem>
        </NavbarContent>

        {nextMethodology && (
          <NavbarContent justify="end">
            <NavbarItem>
              <Button
                variant="flat"
                endContent={
                  <Icon
                    name="NavArrowRight"
                    size="sm"
                    className="text-default-500"
                  />
                }
                onPress={() =>
                  navigate(url(`/methodologies/${nextMethodology.metadata.id}`))
                }
              >
                {t('{methodology} methodology', {
                  methodology:
                    nextMethodology.metadata.i18n?.[lang]?.name ||
                    nextMethodology.metadata.name,
                })}
              </Button>
            </NavbarItem>
          </NavbarContent>
        )}
      </Navbar>
    </DefaultLayout>
  )
}
