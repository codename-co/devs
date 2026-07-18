import { lazy, Suspense, useEffect, type ComponentType } from 'react'
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { LanguageRedirect } from '@/components/LanguageRedirect'
import { defaultLang, I18nProvider, Lang, langs } from '@/i18n'
import { userSettings } from '@/stores/userStore'
import { setActiveSpaceId } from '@/stores/spaceStore'
import { base64urlToUuid } from '@/lib/url'
import { ALL_SPACES_ID, ALL_SPACES_URL_SEGMENT } from '@/types'

// The default (index) route ships in the boot graph — everything else is
// route-level code-split so heavy features (studio, live, marketplace,
// diagrams, comparisons…) never load on boot (REPORT §4 Phase 1).
import { V2Page } from '@/pages/Workspace'

/** Wrap a named export from a dynamic module as a `React.lazy` component. */
function lazyNamed<T extends Record<string, unknown>>(
  factory: () => Promise<T>,
  name: keyof T,
): ComponentType<Record<string, never>> {
  return lazy(async () => ({
    default: (await factory())[name] as ComponentType<Record<string, never>>,
  }))
}

const StudioPage = lazyNamed(
  () => import('@/features/studio/pages/StudioPage'),
  'StudioPage',
)
const AgentsNewPage = lazyNamed(() => import('@/pages/Agents/new'), 'AgentsNewPage')
const AgentRunPage = lazyNamed(() => import('@/pages/Agents/run'), 'AgentRunPage')
const AgentsPage = lazyNamed(() => import('@/pages/Agents'), 'AgentsPage')
const HistoryPage = lazyNamed(() => import('@/pages/History'), 'HistoryPage')
const DemoPage = lazy(() => import('@/pages/Demo/index.mdx'))
const HTMLdemoPage = lazy(() => import('@/pages/Demo/html.mdx'))
const DiagramPage = lazy(() => import('@/pages/Demo/diagram.mdx'))
const CodeSandboxPage = lazyNamed(
  () => import('@/pages/Demo/CodeSandbox'),
  'CodeSandboxPage',
)
const ConversationTestsPage = lazyNamed(
  () => import('@/pages/Demo/ConversationTests'),
  'ConversationTestsPage',
)
const TaskTimelineDemo = lazyNamed(
  () => import('@/pages/Demo/TaskTimelineDemo'),
  'TaskTimelineDemo',
)
const AboutPage = lazyNamed(() => import('@/pages/About'), 'AboutPage')
const PrivacyPage = lazyNamed(() => import('@/pages/Privacy'), 'PrivacyPage')
const TermsPage = lazyNamed(() => import('@/pages/Terms'), 'TermsPage')
const TourPage = lazyNamed(() => import('@/pages/Tour'), 'TourPage')
const TourVideoPage = lazyNamed(() => import('@/pages/Tour'), 'TourVideoPage')
const OAuthCallbackPage = lazyNamed(
  () => import('@/pages/OAuth'),
  'OAuthCallbackPage',
)
const TaskPage = lazyNamed(() => import('@/pages/Tasks/show'), 'TaskPage')
const SessionPage = lazyNamed(() => import('@/pages/Session'), 'SessionPage')
const LivePage = lazyNamed(() => import('@/features/live'), 'LivePage')
const MarketplacePage = lazyNamed(
  () => import('@/features/marketplace/pages'),
  'MarketplacePage',
)
const DynamicAppRoute = lazyNamed(
  () => import('@/features/marketplace/pages'),
  'DynamicAppRoute',
)
const NewExtensionPage = lazyNamed(
  () => import('@/features/marketplace/pages'),
  'NewExtensionPage',
)
const ExtensionEditorPage = lazyNamed(
  () => import('@/features/marketplace/pages'),
  'ExtensionEditorPage',
)
const ComparePage = lazyNamed(() => import('@/pages/Compare/index.tsx'), 'ComparePage')
const CompareAgenticSeekPage = lazyNamed(() => import('@/pages/Compare'), 'CompareAgenticSeekPage')
const CompareBase44Page = lazyNamed(() => import('@/pages/Compare'), 'CompareBase44Page')
const CompareChatGPTPage = lazyNamed(() => import('@/pages/Compare'), 'CompareChatGPTPage')
const CompareDataKitPage = lazyNamed(() => import('@/pages/Compare'), 'CompareDataKitPage')
const CompareDeepChatPage = lazyNamed(() => import('@/pages/Compare'), 'CompareDeepChatPage')
const CompareDualitePage = lazyNamed(() => import('@/pages/Compare'), 'CompareDualitePage')
const CompareHappyCapyPage = lazyNamed(() => import('@/pages/Compare'), 'CompareHappyCapyPage')
const CompareHugstonOnePage = lazyNamed(() => import('@/pages/Compare'), 'CompareHugstonOnePage')
const CompareKortixPage = lazyNamed(() => import('@/pages/Compare'), 'CompareKortixPage')
const CompareLemonAIPage = lazyNamed(() => import('@/pages/Compare'), 'CompareLemonAIPage')
const CompareLlamaPenPage = lazyNamed(() => import('@/pages/Compare'), 'CompareLlamaPenPage')
const CompareManusPage = lazyNamed(() => import('@/pages/Compare'), 'CompareManusPage')
const CompareMiniMaxPage = lazyNamed(() => import('@/pages/Compare'), 'CompareMiniMaxPage')
const CompareNextdocsPage = lazyNamed(() => import('@/pages/Compare'), 'CompareNextdocsPage')
const CompareOpenManusPage = lazyNamed(() => import('@/pages/Compare'), 'CompareOpenManusPage')
const CompareOpenWebUIPage = lazyNamed(() => import('@/pages/Compare'), 'CompareOpenWebUIPage')
const CompareReplitPage = lazyNamed(() => import('@/pages/Compare'), 'CompareReplitPage')
const CompareRomaPage = lazyNamed(() => import('@/pages/Compare'), 'CompareRomaPage')
const CompareRunnerHPage = lazyNamed(() => import('@/pages/Compare'), 'CompareRunnerHPage')
const CompareTracePage = lazyNamed(() => import('@/pages/Compare'), 'CompareTracePage')
const CompareV7GoPage = lazyNamed(() => import('@/pages/Compare'), 'CompareV7GoPage')

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
  tasks: V2Page,
  'tasks/:threadId': V2Page,
  'tasks/:threadId/:tab': V2Page,
  'tasks/:threadId/:inspectType/:inspectId': V2Page,
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
        {renderRoutes()}
        <Route path="spaces/:encodedSpaceId" element={<SpacePath />}>
          {renderRoutes()}
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
    <Suspense fallback={null}>
      <Outlet />
    </Suspense>
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
    return (
      <Suspense fallback={null}>
        <DynamicAppRoute />
      </Suspense>
    )
  }

  return (
    <I18nProvider lang={lang}>
      <Outlet />
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
