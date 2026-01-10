import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'

import { LocalLLMLoadingIndicator } from '@/components'
import { defaultLang, I18nProvider, Lang, langs } from '@/i18n'
import { IndexPage } from '@/pages/Index'
import { DatabasePage } from '@/pages/admin/Database'
import { AgentsNewPage } from '@/pages/Agents/new'
import { AgentRunPage } from '@/pages/Agents/run'
import { AgentsStartPage } from '@/pages/Agents/start'
import { AgentsPage } from '@/pages/Agents'
import { ConversationPage } from '@/pages/Conversation'
import DemoPage from '@/pages/Demo/index.mdx'
import HTMLdemoPage from '@/pages/Demo/html.mdx'
import DiagramPage from '@/pages/Demo/diagram.mdx'
import { PrivacyPage } from '@/pages/Privacy'
import { SyncPage } from '@/pages/Sync'
import { TermsPage } from '@/pages/Terms'
import { KnowledgePage } from '@/pages/Knowledge'
import { MethodologiesPage } from '@/pages/Methodologies/index'
import { MethodologyNewPage } from '@/pages/Methodologies/new'
import { MethodologyPage } from '@/pages/Methodologies/show'
import { NotFoundPage } from '@/pages/NotFound'
import { OAuthCallbackPage } from '@/pages/OAuth'
import { SettingsPage } from '@/pages/Settings'
import { TaskPage } from '@/pages/Tasks/show'
import { TasksPage } from '@/pages/Tasks'
import { VoicePage } from '@/pages/Voice'

/**
 * Redirect component for /connectors -> /knowledge/connectors
 */
const ConnectorsRedirect = () => <Navigate to="/knowledge/connectors" replace />

const routes = {
  index: IndexPage,
  'admin/database': DatabasePage,
  agents: AgentsPage,
  'agents/run': AgentRunPage,
  'agents/new': AgentsNewPage,
  'agents/start': AgentsStartPage,
  // Redirect /connectors to /knowledge/connectors
  connectors: ConnectorsRedirect,
  conversations: ConversationPage,
  demo: DemoPage,
  'demo/diagram': DiagramPage,
  'demo/html': HTMLdemoPage,
  knowledge: KnowledgePage,
  'knowledge/files': KnowledgePage,
  'knowledge/connectors': KnowledgePage,
  'knowledge/memories': KnowledgePage,
  'knowledge/saved': KnowledgePage,
  // Legacy route redirects
  'knowledge/pinned': () => <Navigate to="/knowledge/saved" replace />,
  'knowledge/sources': () => <Navigate to="/knowledge/connectors" replace />,
  methodologies: MethodologiesPage,
  'methodologies/new': MethodologyNewPage,
  'methodologies/:methodologyId': MethodologyPage,
  'oauth/callback': OAuthCallbackPage,
  privacy: PrivacyPage,
  settings: SettingsPage,
  sync: SyncPage,
  task: TaskPage,
  tasks: TasksPage,
  'tasks/:taskId': TaskPage,
  terms: TermsPage,
  voice: VoicePage,
  '*': NotFoundPage,
}

function Router() {
  return (
    <Routes>
      <Route path="/" element={<Outlet />}>
        {Object.entries(routes).map(([path, Component]) => (
          <Route
            key={path}
            path={path === 'index' ? undefined : path}
            element={
              <>
                <Component />
                <LocalLLMLoadingIndicator />
              </>
            }
            index={path === 'index'}
          />
        ))}
        <Route path=":lang" element={<LanguagePath />}>
          {Object.entries(routes).map(([path, Component]) => (
            <Route
              key={path}
              path={path === 'index' ? undefined : path}
              element={<Component />}
              index={path === 'index'}
            />
          ))}
        </Route>
      </Route>
    </Routes>
  )
}

export default Router

const LanguagePath = () => {
  const params = useParams()
  const lang = (params.lang as Lang) || defaultLang

  return (
    <I18nProvider lang={lang}>
      {!langs.includes(lang) ? <NotFoundPage /> : <Outlet />}
      <LocalLLMLoadingIndicator />
    </I18nProvider>
  )
}
export { LanguagePath }
