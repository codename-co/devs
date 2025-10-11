import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  CardBody,
  Chip,
  Pagination,
  Spinner,
} from '@heroui/react'

import { loadAllMethodologies } from '@/stores/methodologiesStore'
import DefaultLayout from '@/layouts/Default'
import type { Methodology } from '@/types/methodology.types'
import { useI18n } from '@/i18n'
import { HeaderProps } from '@/lib/types'
import { Container, Section } from '@/components'
import localI18n from './i18n'

export function MethodologiesPage() {
  const { lang, t, url } = useI18n(localI18n)
  const navigate = useNavigate()
  const [methodologies, setMethodologies] = useState<Methodology[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  const header: HeaderProps = {
    color: 'bg-success-50',
    icon: {
      name: 'PageStar',
      color: 'text-success-300',
    },
    title: t('Methodologies'),
    subtitle: t('Reproduce real-world task execution methodologies'),
    cta: {
      label: t('New Methodology'),
      href: url('/methodologies/new'),
      icon: 'Plus',
    },
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const data = await loadAllMethodologies()
        setMethodologies(
          data.map((m) => ({
            ...m,
            name: () => m.metadata.i18n?.[lang]?.name || m.metadata.name,
            description: () =>
              m.metadata.i18n?.[lang]?.description ||
              m.metadata.description ||
              '',
          })),
        )
      } catch (error) {
        console.error('Failed to load methodologies:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const handleSelectMethodology = (methodologyId: string) => {
    // Navigate to methodology details or apply it
    navigate(url(`/methodologies/${methodologyId}`))
  }

  // Sort methodologies by name and paginate
  const sortedMethodologies = useMemo(
    () => methodologies.sort((a, b) => a.name().localeCompare(b.name())),
    [methodologies],
  )

  const totalPages = Math.ceil(sortedMethodologies.length / itemsPerPage)

  const paginatedMethodologies = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return sortedMethodologies.slice(startIndex, endIndex)
  }, [sortedMethodologies, currentPage, itemsPerPage])

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

  return (
    <DefaultLayout title={t('Methodologies')} header={header}>
      <Section>
        <Container>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" />
            </div>
          ) : methodologies.length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <p className="text-lg text-default-500">
                  No methodologies found
                </p>
                <Button
                  color="primary"
                  className="mt-4"
                  onPress={() => navigate(url('/methodologies/new'))}
                >
                  Create New Methodology
                </Button>
              </CardBody>
            </Card>
          ) : (
            <>
              <div className="space-y-2">
                {paginatedMethodologies.map((methodology) => (
                  <Card
                    key={methodology.metadata.id}
                    isPressable
                    isHoverable
                    shadow="none"
                    className="transition-transform w-full"
                    onPress={() =>
                      handleSelectMethodology(methodology.metadata.id)
                    }
                  >
                    <CardBody className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-medium">
                              {methodology.name()}
                            </h3>
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
                          </div>
                          {methodology.description() && (
                            <p className="text-sm text-default-500 truncate">
                              {methodology.description()}
                            </p>
                          )}
                          {methodology.metadata.tags && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {methodology.metadata.tags
                                .slice(0, 3)
                                .map((tag) => (
                                  <Chip
                                    key={tag}
                                    size="sm"
                                    variant="dot"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Chip>
                                ))}
                              {methodology.metadata.tags.length > 3 && (
                                <Chip
                                  size="sm"
                                  variant="dot"
                                  className="text-xs"
                                >
                                  +{methodology.metadata.tags.length - 3} more
                                </Chip>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm text-default-400">
                            {methodology.phases.length}{' '}
                            {methodology.phases.length === 1
                              ? 'phase'
                              : 'phases'}
                          </span>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination
                    total={totalPages}
                    page={currentPage}
                    onChange={setCurrentPage}
                    showControls
                    size="sm"
                    color="primary"
                  />
                </div>
              )}
            </>
          )}
        </Container>
      </Section>
    </DefaultLayout>
  )
}
