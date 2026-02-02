import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'

import { LocalLLMLoadingIndicator } from '@/components'
import { LanguageRedirect } from '@/components/LanguageRedirect'
import { defaultLang, I18nProvider, Lang, langs } from '@/i18n'
import { StudioPage } from '@/features/studio/pages/StudioPage'
import { CardBattlePage } from '@/features/battle'
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
import { TermsPage } from '@/pages/Terms'
import { KnowledgePage } from '@/pages/Knowledge'
// import { MethodologiesPage } from '@/pages/Methodologies/index'
// import { MethodologyNewPage } from '@/pages/Methodologies/new'
// import { MethodologyPage } from '@/pages/Methodologies/show'
import { OAuthCallbackPage } from '@/pages/OAuth'
import { SettingsPage } from '@/pages/Settings'
import { TaskPage } from '@/pages/Tasks/show'
import { TasksPage } from '@/pages/Tasks'
import { LivePage } from '@/features/live'
import { ArenaPage } from '@/pages/Arena'
import { TracesPage, TraceShowPage } from '@/features/traces'
import {
  MarketplacePage,
  DynamicAppRoute,
  NewExtensionPage,
  ExtensionEditorPage,
} from '@/features/marketplace/pages'

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
  arena2: CardBattlePage,
  'arena2/classic': ArenaPage,
  'arena2/match/:battleId': ArenaPage,
  // Redirect /connectors to /knowledge/connectors
  connectors: ConnectorsRedirect,
  conversations: ConversationPage,
  demo: DemoPage,
  'demo/diagram': DiagramPage,
  'demo/html': HTMLdemoPage,
  studio: StudioPage,
  knowledge: KnowledgePage,
  'knowledge/files': KnowledgePage,
  'knowledge/connectors': KnowledgePage,
  'knowledge/memories': KnowledgePage,
  'knowledge/messages': KnowledgePage,
  // methodologies: MethodologiesPage,
  // 'methodologies/new': MethodologyNewPage,
  // 'methodologies/:methodologyId': MethodologyPage,
  'oauth/callback': OAuthCallbackPage,
  privacy: PrivacyPage,
  settings: SettingsPage,
  task: TaskPage,
  tasks: TasksPage,
  'tasks/:taskId': TaskPage,
  terms: TermsPage,
  traces: TracesPage,
  'traces/logs': TracesPage,
  marketplace: MarketplacePage,
  'marketplace/new': NewExtensionPage,
  'marketplace/extensions/:extensionId/edit': ExtensionEditorPage,
  'traces/sessions': TracesPage,
  'traces/logs/:traceId': TraceShowPage,
  live: LivePage,
  '*': DynamicAppRoute,
}

function Router() {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
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

/**
 * RootLayout handles the language detection redirect at the root level.
 * It renders the LanguageRedirect component to detect and redirect users
 * to their preferred language on first visit.
 */
const RootLayout = () => (
  <>
    <LanguageRedirect />
    <Outlet />
  </>
)

const LanguagePath = () => {
  const params = useParams()
  const lang = (params.lang as Lang) || defaultLang

  // If the lang param is not a valid language, it might be a dynamic app route like /translate
  // Let DynamicAppRoute handle it instead of showing 404
  // This prevents errors like "Invalid language tag" when using lang in toLocaleString()
  if (!langs.includes(lang)) {
    return <DynamicAppRoute />
  }

  return (
    <I18nProvider lang={lang}>
      <Outlet />
      <LocalLLMLoadingIndicator />
    </I18nProvider>
  )
}
export { LanguagePath }
