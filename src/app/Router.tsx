import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'

import { LocalLLMLoadingIndicator } from '@/components'
import { LanguageRedirect } from '@/components/LanguageRedirect'
import { defaultLang, I18nProvider, Lang, langs } from '@/i18n'
import { userSettings } from '@/stores/userStore'
import { setActiveSpaceId } from '@/stores/spaceStore'
import { base64urlToUuid } from '@/lib/url'
import { ALL_SPACES_ID, ALL_SPACES_URL_SEGMENT } from '@/types'
import { StudioPage } from '@/features/studio/pages/StudioPage'
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
import { V2Page } from '@/pages/Workspace'
import { TourPage, TourVideoPage } from '@/pages/Tour'
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
const ConversationsRedirect = () => (
  <Navigate to="../history/conversations" replace />
)

const routes = {
  // V2 pages are the default
  index: V2Page,
  // Explicit static routes for V2 filters (prevent :lang from capturing them)
  agents: V2Page,
  'agents/:threadId': V2Page,
  'agents/:threadId/:tab': V2Page,
  'agents/:threadId/:inspectType/:inspectId': V2Page,
  inbox: V2Page,
  'inbox/:threadId': V2Page,
  'inbox/:threadId/:tab': V2Page,
  'inbox/:threadId/:inspectType/:inspectId': V2Page,
  // Deprecated pages (old Agents & Tasks)
  'deprecated/agents': AgentsPage,
  'deprecated/agents/run': AgentRunPage,
  'deprecated/agents/run/:agentSlug': AgentRunPage,
  'deprecated/agents/run/:agentSlug/:conversationId': AgentRunPage,
  'deprecated/agents/new': AgentsNewPage,
  'deprecated/task': TaskPage,
  'deprecated/tasks/:taskId': TaskPage,
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
  'session/:sessionId': SessionPage,
  library: LibraryRedirect,
  terms: TermsPage,
  marketplace: MarketplacePage,
  'marketplace/new': NewExtensionPage,
  'marketplace/extensions/:extensionId/edit': ExtensionEditorPage,
  live: LivePage,
  tour: TourPage,
  'tour/:videoId': TourVideoPage,
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

function renderRoutes(wrapper?: (el: React.ReactNode) => React.ReactNode) {
  return Object.entries(routes).map(([path, Component]) => (
    <Route
      key={path}
      path={path === 'index' ? undefined : path}
      element={wrapper ? wrapper(<Component />) : <Component />}
      index={path === 'index'}
    />
  ))
}

function Router() {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        {renderRoutes((el) => (
          <>
            {el}
            <LocalLLMLoadingIndicator />
          </>
        ))}
        <Route path="spaces/:encodedSpaceId" element={<SpacePath />}>
          {renderRoutes((el) => (
            <>
              {el}
              <LocalLLMLoadingIndicator />
            </>
          ))}
        </Route>
        <Route path=":lang" element={<LanguagePath />}>
          {renderRoutes()}
          <Route path="spaces/:encodedSpaceId" element={<SpacePath />}>
            {renderRoutes()}
          </Route>
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

/**
 * SpacePath decodes the base64url-encoded space UUID from the URL
 * and sets it as the active space. All child routes inherit the space scope.
 */
const SpacePath = () => {
  const { encodedSpaceId } = useParams()

  useEffect(() => {
    if (!encodedSpaceId) return
    if (encodedSpaceId === ALL_SPACES_URL_SEGMENT) {
      setActiveSpaceId(ALL_SPACES_ID)
      return
    }
    try {
      const spaceId = base64urlToUuid(encodedSpaceId)
      setActiveSpaceId(spaceId)
    } catch {
      // Invalid encoding — fall back to default
    }
  }, [encodedSpaceId])

  return <Outlet />
}
export { SpacePath }
