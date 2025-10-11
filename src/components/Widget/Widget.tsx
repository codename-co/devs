import { Card, CardBody, CardHeader, Tab, Tabs } from '@heroui/react'
import { IconName } from '@/lib/types'
import { useI18n } from '@/i18n'
import { useState, Suspense, lazy } from 'react'
import localI18n from './i18n'
import { ErrorBoundary } from '../ErrorBoundary'
import { Icon } from '../Icon'
import { useScoreTitle } from './Score/titles'
import { usePresentationTitle } from './Presentation/titles'
import { completeStreamingHtml } from './stream-html.utils'
import './widget.css'
import { MonacoEditor } from '../MonacoEditor'

const Diagram = lazy(() =>
  import('./Diagram/Diagram').then((module) => ({ default: module.Diagram })),
)
const Presentation = lazy(() =>
  import('./Presentation/Presentation').then((module) => ({
    default: module.Presentation,
  })),
)
const Score = lazy(() =>
  import('./Score/Score').then((module) => ({ default: module.Score })),
)
const SVG = lazy(() =>
  import('./SVG/SVG').then((module) => ({ default: module.SVG })),
)

// Type definitions for specialized widgets
export type CodeBlockType =
  | 'abc'
  | 'svg'
  | 'diagram'
  | 'marpit'
  | 'html'
  | 'generic'

export interface WidgetProps {
  code: string
  type: CodeBlockType
  language?: string
  className?: string
  title?: string
}

// Main specialized widget component
export const Widget = ({
  code,
  type,
  language,
  className = '',
  title,
}: WidgetProps) => {
  const [viewMode, setViewMode] = useState<'source' | 'render'>('render')
  const { t } = useI18n(localI18n)
  const scoreTitle = useScoreTitle()
  const presentationTitle = usePresentationTitle()

  const getIcon = (): IconName => {
    switch (type) {
      case 'abc':
        return 'MusicNoteSolid'
      case 'svg':
        return 'MediaImage'
      case 'diagram':
        return 'CubeScan'
      case 'marpit':
        return 'Presentation'
      case 'html':
        return 'Html5'
      default:
        return 'Code'
    }
  }

  const getTitle = () => {
    switch (type) {
      case 'abc':
        return scoreTitle
      case 'svg':
        return 'SVG graphics'
      case 'diagram':
        return 'Mermaid diagram'
      case 'marpit':
        return presentationTitle
      case 'html':
        return 'HTML'
      default:
        return `${language || 'Code'} block`
    }
  }

  const getLanguage = () => {
    if (language) return language

    switch (type) {
      case 'abc':
        return 'abc'
      case 'svg':
        return 'xml'
      case 'diagram':
        return 'mermaid'
      case 'marpit':
        return 'yaml'
      case 'html':
        return 'html'
      default:
        return 'plaintext'
    }
  }

  const renderContent = () => {
    if (viewMode === 'source') {
      return (
        <pre className="bg-default-100 p-4 rounded-md overflow-x-auto">
          <MonacoEditor defaultLanguage={getLanguage()} defaultValue={code} />
          {/* <code className="text-sm font-mono">{code}</code> */}
        </pre>
      )
    }

    const Fallback = () => (
      <div className="p-4 text-center text-default-500">{t('Loading…')}</div>
    )

    // Render based on type
    switch (type) {
      case 'abc':
        return (
          <Suspense fallback={<Fallback />}>
            <Score code={code} />
          </Suspense>
        )
      case 'svg':
        return (
          <Suspense fallback={<Fallback />}>
            <SVG code={completeStreamingHtml(code)} />
          </Suspense>
        )
      case 'diagram':
        return (
          <Suspense fallback={<Fallback />}>
            <Diagram code={code} />
          </Suspense>
        )
      case 'marpit':
        return (
          <Suspense fallback={<Fallback />}>
            <Presentation code={code} />
          </Suspense>
        )
      case 'html':
        return (
          <div className="w-full h-[500px]">
            <iframe
              title="HTML Preview"
              srcDoc={completeStreamingHtml(code)}
              className="w-full h-full border-0 rounded-md"
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          </div>
        )
      default:
        // For other types, show source by default until specific renderers are implemented
        return (
          <div className="p-4 bg-warning-50 border border-warning-200 text-warning-700 rounded-md">
            <p className="font-semibold">Renderer Not Implemented</p>
            <p className="text-sm">
              The renderer for "{type}" blocks is not yet implemented. Showing
              source code.
            </p>
            <pre className="bg-default-100 p-4 rounded-md overflow-x-auto mt-2">
              <code className="text-sm font-mono">{code}</code>
            </pre>
          </div>
        )
    }
  }

  return (
    <ErrorBoundary>
      <Card className={`specialized-code-block ${className}`}>
        <CardHeader className="flex justify-between items-center">
          <h4 className="text-sm font-semibold text-default-600">
            <Icon name={getIcon()} className="w-4 h-4 inline-block mr-2" />
            {title ?? getTitle()}
          </h4>

          <div className="flex gap-2">
            <Tabs
              aria-label="View mode"
              size="sm"
              selectedKey={viewMode === 'render' ? 'render' : 'source'}
              onSelectionChange={(key) =>
                setViewMode(key as 'render' | 'source')
              }
            >
              <Tab key="render" title={t('Render')} />
              <Tab key="source" title={t('Code')} />
            </Tabs>
          </div>
        </CardHeader>
        <CardBody className="pt-0">{renderContent()}</CardBody>
      </Card>
    </ErrorBoundary>
  )
}

// Auto-detection helper function
export const detectSpecializedCodeType = (
  code: string,
  language?: string,
): CodeBlockType | null => {
  const trimmedCode = code.trim()

  // ABC Music Notation detection - enhanced for streaming
  if (language === 'abc') {
    return 'abc'
  }

  // // Check for ABC notation patterns - common ABC headers that might appear early in streaming
  // if (
  //   trimmedCode.includes('X:') || // Index number (usually first line)
  //   trimmedCode.includes('T:') || // Title
  //   trimmedCode.includes('M:') || // Meter
  //   trimmedCode.includes('L:') || // Default note length
  //   trimmedCode.includes('K:') || // Key signature
  //   trimmedCode.includes('Q:') || // Tempo
  //   (trimmedCode.includes('M:') && trimmedCode.includes('K:')) // Traditional check
  // ) {
  //   return 'abc'
  // }

  // SVG detection
  if (
    language === 'svg' ||
    (trimmedCode.startsWith('<svg') && trimmedCode.endsWith('</svg>'))
  ) {
    return 'svg'
  }

  // HTML detection
  if (
    language === 'html' ||
    (trimmedCode.match(/<html|<!DOCTYPE html|<head|<body/i) &&
      trimmedCode.includes('<'))
  ) {
    return 'html'
  }

  // Diagram detection (placeholder for future implementations)
  if (language === 'mermaid' || language === 'diagram') {
    return 'diagram'
  }

  // Marpit detection
  if (
    language === 'marpit' ||
    language === 'marp' ||
    trimmedCode.includes('<!-- _class:') || // Marp directive
    trimmedCode.includes('<!-- theme:') || // Theme directive
    trimmedCode.includes('<!-- paginate:') || // Paginate directive
    (trimmedCode.match(/^---$/m) &&
      (trimmedCode.includes('marp:') ||
        trimmedCode.includes('theme:') ||
        trimmedCode.includes('paginate:'))) // YAML frontmatter with Marp config
  ) {
    return 'marpit'
  }

  // Fallback: Long markdown with slide separators could be Marpit
  if (
    language === 'markdown' &&
    trimmedCode.includes('---') &&
    trimmedCode.length > 50
  ) {
    return 'marpit'
  }

  return null
}
