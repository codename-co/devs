import { useEffect } from 'react'
import { Outlet, Route, Routes, useParams } from 'react-router-dom'

import { LocalLLMLoadingIndicator } from '@/components'
import { LanguageRedirect } from '@/components/LanguageRedirect'
import { defaultLang, I18nProvider, Lang, langs } from '@/i18n'
import { userSettings } from '@/stores/userStore'
import { StudioPage } from '@/features/studio/pages/StudioPage'
import { IndexPage } from '@/pages/Index'
import { AgentsNewPage } from '@/pages/Agents/new'
import { AgentRunPage } from '@/pages/Agents/run'
import { AgentsStartPage } from '@/pages/Agents/start'
import { AgentsPage } from '@/pages/Agents'
import { ConversationPage } from '@/pages/Conversation'
import DemoPage from '@/pages/Demo/index.mdx'
import HTMLdemoPage from '@/pages/Demo/html.mdx'
import DiagramPage from '@/pages/Demo/diagram.mdx'
import { CodeSandboxPage } from '@/pages/Demo/CodeSandbox'
import { ConversationTestsPage } from '@/pages/Demo/ConversationTests'
import { AboutPage } from '@/pages/About'
import { PrivacyPage } from '@/pages/Privacy'
import { TermsPage } from '@/pages/Terms'
import { OAuthCallbackPage } from '@/pages/OAuth'
import { TaskPage } from '@/pages/Tasks/show'
import { TasksPage } from '@/pages/Tasks'
import { LivePage } from '@/features/live'
import {
  MarketplacePage,
  DynamicAppRoute,
  NewExtensionPage,
  ExtensionEditorPage,
} from '@/features/marketplace/pages'

const routes = {
  index: IndexPage,
  agents: AgentsPage,
  'agents/run': AgentRunPage,
  'agents/run/:agentSlug': AgentRunPage,
  'agents/run/:agentSlug/:conversationId': AgentRunPage,
  'agents/new': AgentsNewPage,
  'agents/start': AgentsStartPage,
  'agents/start/:agentSlug': AgentsStartPage,
  conversations: ConversationPage,
  demo: DemoPage,
  'demo/code': CodeSandboxPage,
  'demo/conversations': ConversationTestsPage,
  'demo/diagram': DiagramPage,
  'demo/html': HTMLdemoPage,
  studio: StudioPage,
  'oauth/callback': OAuthCallbackPage,
  about: AboutPage,
  privacy: PrivacyPage,
  task: TaskPage,
  tasks: TasksPage,
  'tasks/:taskId': TaskPage,
  terms: TermsPage,
  marketplace: MarketplacePage,
  'marketplace/new': NewExtensionPage,
  'marketplace/extensions/:extensionId/edit': ExtensionEditorPage,
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

  // Sync userSettings.language with the URL-based language so that
  // components rendered outside the inner I18nProvider (e.g. AddLLMProviderModal)
  // also use the correct language.
  useEffect(() => {
    if (langs.includes(lang)) {
      const currentLang = userSettings.getState().language
      if (currentLang !== lang) {
        userSettings.getState().setLanguage(lang)
      }
    }
  }, [lang])

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
