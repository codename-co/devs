/**
 * Standalone PromptArea for Extensions
 *
 * A self-contained PromptArea component for marketplace extensions.
 * This version includes embedded i18n support for 6 languages and has no
 * dependencies on internal DEVS providers like I18nProvider.
 *
 * Usage in extensions:
 *   import { PromptArea } from '@devs/components'
 *
 *   <PromptArea
 *     lang="en"
 *     placeholder="Ask anything..."
 *     onSubmit={(prompt) => console.log(prompt)}
 *   />
 */

import { forwardRef, useState, useCallback, useRef, useEffect } from 'react'
import { Button, Textarea, Tooltip, type TextAreaProps } from '@heroui/react'

// ============================================================================
// Embedded i18n System - No Provider Required
// ============================================================================

/** Supported language codes */
export type LanguageCode = 'en' | 'fr' | 'de' | 'es' | 'ar' | 'ko'

/** Translation keys used in PromptArea */
type TranslationKey =
  | 'Drop files here…'
  | 'Need something done?'
  | 'Speak to microphone'
  | 'Send prompt'
  | 'Select an agent'
  | 'Upload new file'
  | 'Choose from knowledge base'
  | 'Loading agent and conversation…'
  | 'No files found in knowledge base'
  | 'Add connectors'
  | 'No methodologies found'
  | 'Select a methodology'
  | 'Search agents…'
  | 'No agents found'
  | 'Fast'
  | 'Low cost'
  | 'High cost'
  | 'Thinking'
  | 'Vision'
  | 'Tools'
  | 'Select a model'
  | 'Search models...'
  | 'No models found'
  | 'Add AI provider'
  | 'Back'
  | 'Available Agents'
  | 'Scientists'
  | 'Advisors'
  | 'Artists'
  | 'Philosophers'
  | 'Musicians'
  | 'Developers'
  | 'Writers'
  | 'Other Agents'

/** Embedded translations for all supported languages */
const translations: Record<LanguageCode, Record<TranslationKey, string>> = {
  en: {
    'Drop files here…': 'Drop files here…',
    'Need something done?': 'Need something done?',
    'Speak to microphone': 'Speak to microphone',
    'Send prompt': 'Send prompt',
    'Select an agent': 'Select an agent',
    'Upload new file': 'Upload new file',
    'Choose from knowledge base': 'Choose from knowledge base',
    'Loading agent and conversation…': 'Loading agent and conversation…',
    'No files found in knowledge base': 'No files found in knowledge base',
    'Add connectors': 'Add connectors',
    'No methodologies found': 'No methodologies found',
    'Select a methodology': 'Select a methodology',
    'Search agents…': 'Search agents…',
    'No agents found': 'No agents found',
    Fast: 'Fast',
    'Low cost': 'Low cost',
    'High cost': 'High cost',
    Thinking: 'Thinking…',
    Vision: 'Vision',
    Tools: 'Tools',
    'Select a model': 'Select a model',
    'Search models...': 'Search models...',
    'No models found': 'No models found',
    'Add AI provider': 'Add AI provider',
    Back: 'Back',
    'Available Agents': 'Available Agents',
    Scientists: 'Scientists',
    Advisors: 'Advisors',
    Artists: 'Artists',
    Philosophers: 'Philosophers',
    Musicians: 'Musicians',
    Developers: 'Developers',
    Writers: 'Writers',
    'Other Agents': 'Other Agents',
  },
  fr: {
    'Drop files here…': 'Déposez des fichiers ici…',
    'Need something done?': 'Besoin de quelque chose ?',
    'Speak to microphone': 'Dicter au microphone',
    'Send prompt': 'Envoyer le prompt',
    'Select an agent': 'Sélectionner un agent',
    'Upload new file': 'Télécharger un nouveau fichier',
    'Choose from knowledge base': 'Choisir dans la base de connaissances',
    'Loading agent and conversation…':
      "Chargement de l'agent et de la conversation…",
    'No files found in knowledge base':
      'Aucun fichier dans la base de connaissances',
    'Add connectors': 'Ajouter des connecteurs',
    'No methodologies found': 'Aucune méthodologie trouvée',
    'Select a methodology': 'Sélectionner une méthodologie',
    'Search agents…': 'Rechercher un agent…',
    'No agents found': 'Aucun agent trouvé',
    Fast: 'Rapide',
    'Low cost': 'Économique',
    'High cost': 'Coût élevé',
    Thinking: 'Réflexion en cours…',
    Vision: 'Vision',
    Tools: 'Outils',
    'Select a model': 'Sélectionner un modèle',
    'Search models...': 'Rechercher des modèles...',
    'No models found': 'Aucun modèle trouvé',
    'Add AI provider': 'Ajouter un fournisseur LLM',
    Back: 'Retour',
    'Available Agents': 'Agents disponibles',
    Scientists: 'Scientifiques',
    Advisors: 'Conseillers',
    Artists: 'Artistes',
    Philosophers: 'Philosophes',
    Musicians: 'Musiciens',
    Developers: 'Développeurs',
    Writers: 'Écrivains',
    'Other Agents': 'Autres agents',
  },
  de: {
    'Drop files here…': 'Dateien hier ablegen…',
    'Need something done?': 'Benötigen Sie etwas?',
    'Speak to microphone': 'Ins Mikrofon sprechen',
    'Send prompt': 'Prompt senden',
    'Select an agent': 'Agent auswählen',
    'Upload new file': 'Neue Datei hochladen',
    'Choose from knowledge base': 'Aus Wissensdatenbank auswählen',
    'Loading agent and conversation…': 'Lade Agent und Unterhaltung…',
    'No files found in knowledge base':
      'Keine Dateien in der Wissensdatenbank gefunden',
    'Add connectors': 'Konnektoren hinzufügen',
    'No methodologies found': 'Keine Methodiken gefunden',
    'Select a methodology': 'Methodik auswählen',
    'Search agents…': 'Agenten suchen…',
    'No agents found': 'Keine Agenten gefunden',
    Fast: 'Schnell',
    'Low cost': 'Günstig',
    'High cost': 'Teuer',
    Thinking: 'Denkt nach…',
    Vision: 'Vision',
    Tools: 'Werkzeuge',
    'Select a model': 'Modell auswählen',
    'Search models...': 'Modelle suchen...',
    'No models found': 'Keine Modelle gefunden',
    'Add AI provider': 'LLM-Anbieter hinzufügen',
    Back: 'Zurück',
    'Available Agents': 'Verfügbare Agenten',
    Scientists: 'Wissenschaftler',
    Advisors: 'Berater',
    Artists: 'Künstler',
    Philosophers: 'Philosophen',
    Musicians: 'Musiker',
    Developers: 'Entwickler',
    Writers: 'Schriftsteller',
    'Other Agents': 'Weitere Agenten',
  },
  es: {
    'Drop files here…': 'Suelta archivos aquí…',
    'Need something done?': '¿Necesitas que se haga algo?',
    'Speak to microphone': 'Hablar al micrófono',
    'Send prompt': 'Enviar prompt',
    'Select an agent': 'Seleccionar un agente',
    'Upload new file': 'Subir nuevo archivo',
    'Choose from knowledge base': 'Elegir de la base de conocimientos',
    'Loading agent and conversation…': 'Cargando agente y conversación…',
    'No files found in knowledge base':
      'No se encontraron archivos en la base de conocimientos',
    'Add connectors': 'Agregar conectores',
    'No methodologies found': 'No se encontraron metodologías',
    'Select a methodology': 'Seleccionar una metodología',
    'Search agents…': 'Buscar agentes…',
    'No agents found': 'No se encontraron agentes',
    Fast: 'Rápido',
    'Low cost': 'Bajo costo',
    'High cost': 'Alto costo',
    Thinking: 'Pensando…',
    Vision: 'Visión',
    Tools: 'Herramientas',
    'Select a model': 'Seleccionar un modelo',
    'Search models...': 'Buscar modelos...',
    'No models found': 'No se encontraron modelos',
    'Add AI provider': 'Agregar proveedor LLM',
    Back: 'Atrás',
    'Available Agents': 'Agentes disponibles',
    Scientists: 'Científicos',
    Advisors: 'Asesores',
    Artists: 'Artistas',
    Philosophers: 'Filósofos',
    Musicians: 'Músicos',
    Developers: 'Desarrolladores',
    Writers: 'Escritores',
    'Other Agents': 'Otros agentes',
  },
  ar: {
    'Drop files here…': 'أسقط الملفات هنا…',
    'Need something done?': 'هل تحتاج إلى إنجاز شيء؟',
    'Speak to microphone': 'التحدث إلى الميكروفون',
    'Send prompt': 'إرسال الطلب',
    'Select an agent': 'اختر وكيلاً',
    'Upload new file': 'رفع ملف جديد',
    'Choose from knowledge base': 'اختر من قاعدة المعرفة',
    'Loading agent and conversation…': 'جارٍ تحميل الوكيل والمحادثة…',
    'No files found in knowledge base':
      'لم يتم العثور على ملفات في قاعدة المعرفة',
    'Add connectors': 'إضافة موصلات',
    'No methodologies found': 'لم يتم العثور على منهجيات',
    'Select a methodology': 'اختر منهجية',
    'Search agents…': 'البحث عن وكلاء…',
    'No agents found': 'لم يتم العثور على وكلاء',
    Fast: 'سريع',
    'Low cost': 'منخفض التكلفة',
    'High cost': 'مرتفع التكلفة',
    Thinking: 'يفكر…',
    Vision: 'رؤية',
    Tools: 'أدوات',
    'Select a model': 'اختر نموذجاً',
    'Search models...': 'البحث عن نماذج...',
    'No models found': 'لم يتم العثور على نماذج',
    'Add AI provider': 'إضافة مزود LLM',
    Back: 'رجوع',
    'Available Agents': 'الوكلاء المتاحون',
    Scientists: 'العلماء',
    Advisors: 'المستشارون',
    Artists: 'الفنانون',
    Philosophers: 'الفلاسفة',
    Musicians: 'الموسيقيون',
    Developers: 'المطورون',
    Writers: 'الكتّاب',
    'Other Agents': 'وكلاء آخرون',
  },
  ko: {
    'Drop files here…': '여기에 파일을 드롭하세요…',
    'Need something done?': '무언가 필요하신가요?',
    'Speak to microphone': '마이크에 대고 말하기',
    'Send prompt': '프롬프트 전송',
    'Select an agent': '에이전트 선택',
    'Upload new file': '새 파일 업로드',
    'Choose from knowledge base': '지식 베이스에서 선택',
    'Loading agent and conversation…': '에이전트 및 대화 로딩 중…',
    'No files found in knowledge base': '지식 베이스에 파일이 없습니다',
    'Add connectors': '커넥터 추가',
    'No methodologies found': '방법론을 찾을 수 없습니다',
    'Select a methodology': '방법론 선택',
    'Search agents…': '에이전트 검색…',
    'No agents found': '에이전트를 찾을 수 없습니다',
    Fast: '빠름',
    'Low cost': '저렴함',
    'High cost': '고비용',
    Thinking: '생각 중…',
    Vision: '비전',
    Tools: '도구',
    'Select a model': '모델 선택',
    'Search models...': '모델 검색...',
    'No models found': '모델을 찾을 수 없습니다',
    'Add AI provider': 'LLM 공급자 추가',
    Back: '뒤로',
    'Available Agents': '사용 가능한 에이전트',
    Scientists: '과학자',
    Advisors: '고문',
    Artists: '예술가',
    Philosophers: '철학자',
    Musicians: '음악가',
    Developers: '개발자',
    Writers: '작가',
    'Other Agents': '기타 에이전트',
  },
}

/**
 * Standalone translation function - no provider required.
 * @param lang - The language code
 * @param key - The translation key
 * @param vars - Optional variables to interpolate
 * @returns The translated string
 */
export function translate(
  lang: LanguageCode,
  key: TranslationKey | string,
  vars?: Record<string, string | number>,
): string {
  const langTranslations = translations[lang] || translations.en
  let result = langTranslations[key as TranslationKey] || key

  if (vars) {
    for (const [varKey, varValue] of Object.entries(vars)) {
      result = result.replace(
        new RegExp(`\\{${varKey}\\}`, 'g'),
        String(varValue),
      )
    }
  }

  return result
}

/**
 * Creates a bound translation function for a specific language.
 * @param lang - The language code
 * @returns A translation function bound to the specified language
 */
export function createTranslator(lang: LanguageCode) {
  return (
    key: TranslationKey | string,
    vars?: Record<string, string | number>,
  ) => translate(lang, key, vars)
}

// ============================================================================
// PromptArea Component
// ============================================================================

export interface PromptAreaProps
  extends Omit<TextAreaProps, 'onKeyDown' | 'onSubmit'> {
  /** Language code for i18n (defaults to 'en') */
  lang?: LanguageCode
  /** Callback when the user submits the prompt */
  onSubmit?: (prompt: string) => void
  /** Whether a request is currently in progress */
  isLoading?: boolean
  /** Default prompt text */
  defaultPrompt?: string
  /** Placeholder text (overrides i18n default) */
  placeholder?: string
  /** Tooltip for the submit button (overrides i18n default) */
  tooltip?: string
  /** Minimum number of rows */
  minRows?: number
  /** Custom submit button content */
  submitLabel?: React.ReactNode
  /** Whether to show the submit button */
  showSubmitButton?: boolean
  /** Keyboard handler */
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>
  /** Enable drag and drop file support */
  enableDragDrop?: boolean
  /** Callback when files are dropped */
  onFilesChange?: (files: File[]) => void
}

/**
 * Standalone PromptArea component for marketplace extensions.
 * Provides a textarea with submit button, suitable for chat/prompt interfaces.
 * Includes embedded i18n support - no provider required.
 */
export const PromptArea = forwardRef<HTMLTextAreaElement, PromptAreaProps>(
  function PromptArea(
    {
      className,
      lang = 'en',
      onSubmit,
      onValueChange,
      defaultPrompt = '',
      placeholder,
      tooltip,
      minRows = 3,
      isLoading = false,
      submitLabel,
      showSubmitButton = true,
      onKeyDown,
      enableDragDrop = false,
      onFilesChange,
      ...props
    },
    ref,
  ) {
    const t = createTranslator(lang)
    const [prompt, setPrompt] = useState(defaultPrompt)
    const [isDragOver, setIsDragOver] = useState(false)
    const internalRef = useRef<HTMLTextAreaElement>(null)
    const textareaRef =
      (ref as React.RefObject<HTMLTextAreaElement>) || internalRef

    // Sync with controlled value
    useEffect(() => {
      if (props.value !== undefined && props.value !== prompt) {
        setPrompt(props.value as string)
      }
    }, [props.value])

    // Sync with default prompt changes
    useEffect(() => {
      if (defaultPrompt && !prompt) {
        setPrompt(defaultPrompt)
        onValueChange?.(defaultPrompt)
      }
    }, [defaultPrompt])

    const handlePromptChange = useCallback(
      (value: string) => {
        setPrompt(value)
        onValueChange?.(value)
      },
      [onValueChange],
    )

    const handleSubmit = useCallback(() => {
      if (!prompt.trim() || isLoading) return
      onSubmit?.(prompt.trim())
    }, [prompt, isLoading, onSubmit])

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          handleSubmit()
        }
        onKeyDown?.(event as React.KeyboardEvent<HTMLTextAreaElement>)
      },
      [handleSubmit, onKeyDown],
    )

    // Drag and drop handlers
    const handleDragEnter = useCallback(
      (event: React.DragEvent) => {
        if (!enableDragDrop) return
        event.preventDefault()
        event.stopPropagation()
        setIsDragOver(true)
      },
      [enableDragDrop],
    )

    const handleDragOver = useCallback(
      (event: React.DragEvent) => {
        if (!enableDragDrop) return
        event.preventDefault()
        event.stopPropagation()
      },
      [enableDragDrop],
    )

    const handleDragLeave = useCallback(
      (event: React.DragEvent) => {
        if (!enableDragDrop) return
        event.preventDefault()
        event.stopPropagation()
        setIsDragOver(false)
      },
      [enableDragDrop],
    )

    const handleDrop = useCallback(
      (event: React.DragEvent) => {
        if (!enableDragDrop) return
        event.preventDefault()
        event.stopPropagation()
        setIsDragOver(false)

        const files = Array.from(event.dataTransfer.files)
        if (files.length > 0) {
          onFilesChange?.(files)
        }
      },
      [enableDragDrop, onFilesChange],
    )

    const canSubmit = prompt.trim().length > 0 && !isLoading
    const resolvedPlaceholder =
      placeholder ||
      (enableDragDrop && isDragOver
        ? t('Drop files here…')
        : t('Need something done?'))

    // Default submit label with arrow icon
    const resolvedSubmitLabel = submitLabel || '→'

    const resolvedTooltip = tooltip || t('Send prompt')

    return (
      <div
        className={`relative ${className || ''} ${isDragOver ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Textarea
          ref={textareaRef}
          value={prompt}
          placeholder={resolvedPlaceholder}
          minRows={minRows}
          onValueChange={handlePromptChange}
          onKeyDown={handleKeyDown}
          isDisabled={isLoading}
          classNames={{
            inputWrapper: 'pb-12',
          }}
          {...props}
        />

        {showSubmitButton && (
          <div className="absolute z-10 bottom-0 inset-x-px p-2 rounded-b-lg">
            <div className="flex justify-end">
              <Tooltip content={resolvedTooltip} placement="bottom">
                <Button
                  type="submit"
                  color={canSubmit ? 'primary' : 'default'}
                  variant="solid"
                  size="sm"
                  radius="md"
                  isDisabled={!canSubmit}
                  isLoading={isLoading}
                  onPress={handleSubmit}
                  className={canSubmit ? 'dark:bg-white dark:text-black' : ''}
                >
                  {resolvedSubmitLabel}
                </Button>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    )
  },
)

export default PromptArea
