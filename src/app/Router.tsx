import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'

import { LocalLLMLoadingIndicator } from '@/components'
import { LanguageRedirect } from '@/components/LanguageRedirect'
import { defaultLang, I18nProvider, Lang, langs } from '@/i18n'
import { userSettings } from '@/stores/userStore'
import { StudioPage } from '@/features/studio/pages/StudioPage'
import { IndexPage } from '@/pages/Index'
import { AgentsNewPage } from '@/pages/Agents/new'
import { AgentRunPage } from '@/pages/Agents/run'
import { AgentsPage } from '@/pages/Agents'
import { HistoryPage } from '@/pages/History'
import DemoPage from '@/pages/Demo/index.mdx'
import HTMLdemoPage from '@/pages/Demo/html.mdx'
import DiagramPage from '@/pages/Demo/diagram.mdx'
import { CodeSandboxPage } from '@/pages/Demo/CodeSandbox'
import { ConversationTestsPage } from '@/pages/Demo/ConversationTests'
import { TaskTimelineDemo } from '@/pages/Demo/TaskTimelineDemo'
import { AboutPage } from '@/pages/About'
import { PrivacyPage } from '@/pages/Privacy'
import { TermsPage } from '@/pages/Terms'
import { V2Page } from '@/pages/V2'
import { OAuthCallbackPage } from '@/pages/OAuth'
import { TaskPage } from '@/pages/Tasks/show'
import { SessionPage } from '@/pages/Session'
import { LivePage } from '@/features/live'
import {
  MarketplacePage,
  DynamicAppRoute,
  NewExtensionPage,
  ExtensionEditorPage,
} from '@/features/marketplace/pages'
import {
  CompareAgenticSeekPage,
  CompareBase44Page,
  CompareChatGPTPage,
  CompareDataKitPage,
  CompareDeepChatPage,
  CompareDualitePage,
  CompareHappyCapyPage,
  CompareHugstonOnePage,
  CompareKortixPage,
  CompareLemonAIPage,
  CompareLlamaPenPage,
  CompareManusPage,
  CompareMiniMaxPage,
  CompareNextdocsPage,
  CompareOpenManusPage,
  CompareOpenWebUIPage,
  CompareReplitPage,
  CompareRomaPage,
  CompareRunnerHPage,
  CompareTracePage,
  CompareV7GoPage,
} from '@/pages/Compare'
import { ComparePage } from '@/pages/Compare/index.tsx'

// Redirect components for old paths → history tabs
const LibraryRedirect = () => <Navigate to="../history" replace />
const TasksRedirect = () => <Navigate to="../history/tasks" replace />
const ConversationsRedirect = () => (
  <Navigate to="../history/conversations" replace />
)

const routes = {
  v2: V2Page,
  index: IndexPage,
  agents: AgentsPage,
  'agents/run': AgentRunPage,
  'agents/run/:agentSlug': AgentRunPage,
  'agents/run/:agentSlug/:conversationId': AgentRunPage,
  'agents/new': AgentsNewPage,
  history: HistoryPage,
  'history/library': HistoryPage,
  'history/memories': HistoryPage,
  'history/tasks': HistoryPage,
  'history/conversations': HistoryPage,
  conversations: ConversationsRedirect,
  demo: DemoPage,
  'demo/code': CodeSandboxPage,
  'demo/conversations': ConversationTestsPage,
  'demo/diagram': DiagramPage,
  'demo/html': HTMLdemoPage,
  'demo/timeline': TaskTimelineDemo,
  studio: StudioPage,
  'oauth/callback': OAuthCallbackPage,
  about: AboutPage,
  privacy: PrivacyPage,
  task: TaskPage,
  tasks: TasksRedirect,
  'tasks/:taskId': TaskPage,
  'session/:sessionId': SessionPage,
  library: LibraryRedirect,
  terms: TermsPage,
  marketplace: MarketplacePage,
  'marketplace/new': NewExtensionPage,
  'marketplace/extensions/:extensionId/edit': ExtensionEditorPage,
  live: LivePage,
  compare: ComparePage,
  'compare/agenticseek': CompareAgenticSeekPage,
  'compare/base44': CompareBase44Page,
  'compare/chatgpt': CompareChatGPTPage,
  'compare/datakit': CompareDataKitPage,
  'compare/deepchat': CompareDeepChatPage,
  'compare/dualite': CompareDualitePage,
  'compare/happycapy': CompareHappyCapyPage,
  'compare/hugstonone': CompareHugstonOnePage,
  'compare/kortix': CompareKortixPage,
  'compare/lemonai': CompareLemonAIPage,
  'compare/llamapen': CompareLlamaPenPage,
  'compare/manus': CompareManusPage,
  'compare/minimax': CompareMiniMaxPage,
  'compare/nextdocs': CompareNextdocsPage,
  'compare/openmanus': CompareOpenManusPage,
  'compare/openwebui': CompareOpenWebUIPage,
  'compare/replit': CompareReplitPage,
  'compare/roma': CompareRomaPage,
  'compare/runnerh': CompareRunnerHPage,
  'compare/trace': CompareTracePage,
  'compare/v7go': CompareV7GoPage,
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
