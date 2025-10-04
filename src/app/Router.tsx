import { Outlet, Route, Routes, useParams } from 'react-router-dom'

import { LocalLLMLoadingIndicator } from '@/components'
import { defaultLang, I18nProvider, Lang, langs } from '@/i18n'
import { IndexPage } from '@/pages/Index'
import { NotFoundPage } from '@/pages/NotFound'
import { SettingsPage } from '@/pages/Settings'
import { ConversationPage } from '@/pages/Conversation'
import { AgentsNewPage } from '@/pages/AgentsNew'
import { AgentRunPage } from '@/pages/AgentRun'
import { AgentsPage } from '@/pages/Agents'
import { TaskPage } from '@/pages/Task'
import { TasksPage } from '@/pages/Tasks'
import { KnowledgePage } from '@/pages/Knowledge'
import { DatabasePage } from '@/pages/admin/Database'
import DemoPage from '@/pages/Demo/index.mdx'

const routes = {
  index: IndexPage,
  agents: AgentsPage,
  settings: SettingsPage,
  conversations: ConversationPage,
  knowledge: KnowledgePage,
  'agents/run': AgentRunPage,
  'agents/new': AgentsNewPage,
  tasks: TasksPage,
  'tasks/:taskId': TaskPage,
  task: TaskPage,
  'admin/database': DatabasePage,
  demo: DemoPage,
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
