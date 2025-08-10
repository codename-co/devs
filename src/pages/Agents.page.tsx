import { Alert, Card, CardBody, Spinner, Tab, Tabs } from '@heroui/react'
import { useEffect, useState } from 'react'

import { useI18n } from '@/i18n'
import { getAgentsSeparated } from '@/stores/agentStore'
import { type Agent } from '@/types'
import { Container, Section } from '@/components'
import { AgentCard } from '@/components/AgentCard'
import DefaultLayout from '@/layouts/Default'
import { HeaderProps } from '@/lib/types'
import { useNavigate } from 'react-router-dom'

export const AgentsPage = () => {
  const [userAgents, setUserAgents] = useState<Agent[]>([])
  const [globalAgents, setGlobalAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('my-agents')

  const { t, url } = useI18n()
  const navigate = useNavigate()

  const fetchAgents = async () => {
    setLoading(true)
    try {
      const { customAgents, builtInAgents } = await getAgentsSeparated()

      setUserAgents(customAgents)
      setGlobalAgents(builtInAgents)
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  // Refresh agents when component becomes visible (for when user navigates back from creating an agent)
  useEffect(() => {
    const handleFocus = () => {
      fetchAgents()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const handleAgentClick = (agentId: string) => {
    navigate(url(`/agents/run#${agentId}`))
  }

  const renderAgentGrid = (agents: Agent[], isGlobal = false) => {
    if (agents.length === 0) {
      return (
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-default-500 mb-4">
              {isGlobal
                ? 'No global agents available.'
                : 'No custom agents found yet.'}
            </p>
            {!isGlobal && (
              <p className="text-default-400 text-sm">
                Click "New Agent" above to create your first custom agent!
              </p>
            )}
          </CardBody>
        </Card>
      )
    }

    return (
      <div className="gap-2 grid grid-cols-12 grid-rows-2">
        {agents.map((agent) => (
          <AgentCard
            id={agent.id}
            key={agent.id}
            className="col-span-12 sm:col-span-4"
            onPress={handleAgentClick}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <Container>
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      </Container>
    )
  }

  const header: HeaderProps = {
    color: 'bg-warning-50',
    icon: {
      name: 'Sparks',
      color: 'text-warning-500',
    },
    title: t('Agents'),
    cta: {
      label: t('New Agent'),
      href: url('/agents/new'),
      icon: 'Plus',
    },
  }

  return (
    <DefaultLayout title={t('Agents')} header={header}>
      <Section>
        <Container>
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as string)}
            className="w-full"
          >
            <Tab
              key="my-agents"
              title={t(`My Agents ({count})`, {
                count: userAgents.length,
              })}
            >
              {renderAgentGrid(userAgents, false)}
            </Tab>
            <Tab
              key="global-agents"
              title={t(`Built-in Agents ({count})`, {
                count: globalAgents.length,
              })}
            >
              <Alert color="default" variant="faded" className="mb-6">
                Built-in agents are pre-configured agents that come with the
                platform. They showcase various capabilities and can serve as
                inspiration for your own custom agents.
              </Alert>
              {renderAgentGrid(globalAgents, true)}
            </Tab>
          </Tabs>
        </Container>
      </Section>
    </DefaultLayout>
  )
}
