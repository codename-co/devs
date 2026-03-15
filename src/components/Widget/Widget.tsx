import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tooltip,
} from '@heroui/react'
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

export interface WidgetAction {
  label: string
  icon?: IconName
  onPress: () => void
}

export interface WidgetProps {
  code: string
  type: CodeBlockType
  language?: string
  className?: string
  title?: string
  showActions?: boolean
  moreActions?: WidgetAction[]
}

// Main specialized widget component
export const Widget = ({
  code,
  type,
  language,
  className = '',
  title,
  showActions = true,
  moreActions,
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
        return language
          ? language.at(0)?.toUpperCase() + language.slice(1)
          : 'Code'
    }
  }

  const getLanguage = () => {
    if (language) return language

    switch (type) {
      case 'abc':
        return 'yaml'
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
      <div className="p-4 text-center text-sm text-default-500">
        {t('Loading…')}
      </div>
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
          <div className="w-full h-full">
            <iframe
              title="HTML Preview"
              srcDoc={completeStreamingHtml(code)}
              className="w-full h-full border-0 rounded-md min-h-200"
              sandbox="allow-same-origin allow-scripts allow-forms allow-pointer-lock"
            />
          </div>
        )
      default:
        // For other types, show source by default until specific renderers are implemented
        return (
          <pre className="bg-default-100 p-4 rounded-md overflow-x-auto mt-2">
            <code className="text-sm font-mono">{code}</code>
          </pre>
        )
    }
  }

  return (
    <ErrorBoundary>
      <Card
        className={`specialized-code-block border-b border-default-200 last:border-b-0 ${className}`}
        radius="none"
        shadow="none"
        fullWidth
      >
        {showActions && (
          <CardHeader className="flex items-center justify-end px-0">
            {showActions && (
              <div className="flex items-center gap-2">
                {moreActions?.map((action, i) => (
                  <Tooltip key={i} content={action.label}>
                    <Button
                      isIconOnly
                      variant="light"
                      aria-label={action.label}
                      size="sm"
                      onPress={action.onPress}
                      startContent={
                        <Icon name={action.icon ?? 'Expand'} size="sm" />
                      }
                    />
                  </Tooltip>
                ))}

                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      isIconOnly
                      variant="light"
                      aria-label={t('Hide extended actions')}
                      size="sm"
                      startContent={<Icon name="MoreHoriz" size="sm" />}
                    />
                  </DropdownTrigger>

                  <DropdownMenu>
                    <DropdownItem
                      key="info"
                      startContent={<Icon name={getIcon()} size="sm" />}
                      title={title ?? getTitle()}
                      isDisabled
                    />
                    <DropdownItem
                      key="render"
                      startContent={<Icon name="Eye" size="sm" />}
                      title={t('Render')}
                      onPress={() => setViewMode('render')}
                    />
                    <DropdownItem
                      key="source"
                      startContent={<Icon name="Code" size="sm" />}
                      title={t('Code')}
                      onPress={() => setViewMode('source')}
                    />
                    <>
                      {moreActions?.map((action, i) => (
                        <DropdownItem
                          key={i}
                          startContent={
                            action.icon ? (
                              <Icon name={action.icon} size="sm" />
                            ) : null
                          }
                          title={action.label}
                          onPress={action.onPress}
                        />
                      ))}
                    </>
                  </DropdownMenu>
                </Dropdown>
              </div>
            )}
          </CardHeader>
        )}
        <CardBody className="p-0">{renderContent()}</CardBody>
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
