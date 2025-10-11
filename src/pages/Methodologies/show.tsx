import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Accordion,
  AccordionItem,
  Card,
  CardBody,
  Chip,
  Spinner,
} from '@heroui/react'

import { Container, Section, Widget } from '@/components'
import DefaultLayout from '@/layouts/Default'
import { MethodologyMermaidGenerator } from '@/lib/methodology-mermaid-generator'
import { getMethodologyById } from '@/stores/methodologiesStore'
import type { Methodology } from '@/types/methodology.types'
import { useI18n } from '@/i18n'
import { HeaderProps } from '@/lib/types'
import { errorToast } from '@/lib/toast'
import localI18n from './i18n'

export const MethodologyPage = () => {
  const { lang, t, url } = useI18n(localI18n)
  const navigate = useNavigate()
  const params = useParams()
  const methodologyId = params.methodologyId

  const [methodology, setMethodology] = useState<Methodology | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [diagramCode, setDiagramCode] = useState<string>('')

  const header: HeaderProps = {
    color: 'bg-success-50',
    icon: {
      name: 'PageStar',
      color: 'text-success-300',
    },
    title: methodology?.name(),
    subtitle: t('Methodology Details'),
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

        setMethodology({
          ...data,
          name: () => data.metadata.i18n?.[lang]?.name || data.metadata.name,
          description: () =>
            data.metadata.i18n?.[lang]?.description ||
            data.metadata.description ||
            '',
        })

        // Generate Mermaid diagram
        const generator = new MethodologyMermaidGenerator(data, {
          includeNotes: false,
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
  }, [methodologyId])

  const getComplexityColor = (
    complexity?: string,
  ): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' => {
    switch (complexity) {
      case 'simple':
        return 'success'
      case 'moderate':
        return 'primary'
      case 'complex':
        return 'warning'
      case 'expert':
        return 'danger'
      default:
        return 'default'
    }
  }

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
    <DefaultLayout title={methodology.name()} header={header}>
      <Section>
        <Container>
          <div className="space-y-6">
            {/* Metadata Card */}
            <Card>
              <CardBody className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Chip size="sm" variant="flat">
                    {methodology.metadata.type}
                  </Chip>
                  {methodology.metadata.complexity && (
                    <Chip
                      size="sm"
                      color={getComplexityColor(
                        methodology.metadata.complexity,
                      )}
                      variant="flat"
                    >
                      {methodology.metadata.complexity}
                    </Chip>
                  )}
                  {methodology.metadata.origin && (
                    <Chip size="sm" variant="dot">
                      {methodology.metadata.origin}
                    </Chip>
                  )}
                </div>

                {methodology.description() && (
                  <p className="text-default-700">
                    {methodology.description()}
                  </p>
                )}

                {methodology.metadata.domains &&
                  methodology.metadata.domains.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">
                        {t('Domains')}
                      </h4>
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
                      <h4 className="text-sm font-semibold mb-2">
                        {t('Tags')}
                      </h4>
                      <div className="flex gap-2 flex-wrap">
                        {methodology.metadata.tags.map((tag) => (
                          <Chip key={tag} size="sm" variant="dot">
                            {tag}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}
              </CardBody>
            </Card>

            {/* Workflow Diagram */}
            {diagramCode && (
              <Widget
                type="diagram"
                language="mermaid"
                code={diagramCode}
                title={t('Workflow Diagram')}
              />
            )}

            {/* Phases */}
            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold mb-4">
                  {t('Phases')} ({methodology.phases.length})
                </h3>
                <div className="space-y-4">
                  <Accordion>
                    {methodology.phases.map((phase, index) => (
                      <AccordionItem
                        key={phase.id}
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
                </div>
              </CardBody>
            </Card>

            {/* Agent Coordination */}
            {methodology.agentCoordination?.roles &&
              methodology.agentCoordination.roles.length > 0 && (
                <Card>
                  <CardBody>
                    <h3 className="text-lg font-semibold mb-4">
                      {t('Agent Roles')}
                    </h3>
                    <div className="space-y-3 gap-2 grid grid-cols-12 grid-rows-2">
                      {methodology.agentCoordination.roles.map((role) => (
                        <div
                          key={role.id}
                          className="col-span-12 md:col-span-4 relative group"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{role.name}</h4>
                            {role.authority && (
                              <Chip size="sm" variant="flat">
                                {role.authority}
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
                  </CardBody>
                </Card>
              )}
          </div>
        </Container>
      </Section>
    </DefaultLayout>
  )
}
