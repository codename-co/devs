import { Outlet, Route, Routes, useParams } from 'react-router-dom'

import { defaultLang, I18nProvider, Lang, langs } from '@/i18n'
import { IndexPage } from '@/pages/Index.page'
import { NotFoundPage } from '@/pages/NotFound.page'
import { SettingsPage } from '@/pages/Settings.page'
import { ConversationPage } from '@/pages/Conversation.page'
import { AgentsNewPage } from '@/pages/AgentsNew.page'
import { AgentRunPage } from '@/pages/AgentRun.page'
import { AgentsPage } from '@/pages/Agents.page'
import { TaskPage } from '@/pages/Task.page'
import { TasksPage } from '@/pages/Tasks.page'
import { KnowledgePage } from '@/pages/Knowledge.page'
import DatabasePage from '@/pages/admin/Database.page'
import DemoPage from '@/pages/Demo.page.mdx'

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
    </I18nProvider>
  )
}
export { LanguagePath }
