import { Outlet, Route, Routes, useParams } from 'react-router-dom'

import { LocalLLMLoadingIndicator } from '@/components'
import { defaultLang, I18nProvider, Lang, langs } from '@/i18n'
import { IndexPage } from '@/pages/Index'
import { DatabasePage } from '@/pages/admin/Database'
import { AgentsNewPage } from '@/pages/Agents/new'
import { AgentRunPage } from '@/pages/Agents/run'
import { AgentsPage } from '@/pages/Agents'
import { ConversationPage } from '@/pages/Conversation'
import DemoPage from '@/pages/Demo/index.mdx'
import HTMLdemoPage from '@/pages/Demo/html.mdx'
import DiagramPage from '@/pages/Demo/diagram.mdx'
import { KnowledgePage } from '@/pages/Knowledge'
import { MethodologiesPage } from '@/pages/Methodologies/index'
import { MethodologyNewPage } from '@/pages/Methodologies/new'
import { MethodologyPage } from '@/pages/Methodologies/show'
import { NotFoundPage } from '@/pages/NotFound'
import { SettingsPage } from '@/pages/Settings'
import { TaskPage } from '@/pages/Tasks/show'
import { TasksPage } from '@/pages/Tasks'

const routes = {
  index: IndexPage,
  'admin/database': DatabasePage,
  agents: AgentsPage,
  'agents/run': AgentRunPage,
  'agents/new': AgentsNewPage,
  conversations: ConversationPage,
  demo: DemoPage,
  'demo/diagram': DiagramPage,
  'demo/html': HTMLdemoPage,
  knowledge: KnowledgePage,
  methodologies: MethodologiesPage,
  'methodologies/new': MethodologyNewPage,
  'methodologies/:methodologyId': MethodologyPage,
  settings: SettingsPage,
  task: TaskPage,
  tasks: TasksPage,
  'tasks/:taskId': TaskPage,
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
              <I18nProvider>
                <Component />
                <LocalLLMLoadingIndicator />
              </I18nProvider>
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
