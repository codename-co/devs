/**
 * Extension Editor Page
 *
 * Conversation-driven extension editor with:
 * - Multi-page editing support
 * - Monaco editor for code visualization
 * - Live preview with console output capture
 * - Metadata editing via form
 * - AI assistant with specialized tools (code editing, console access)
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Textarea,
  Select,
  SelectItem,
  Spinner,
  Chip,
  Divider,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  ScrollShadow,
  Popover,
  PopoverContent,
  Dropdown,
  DropdownItem,
  DropdownTrigger,
  DropdownMenu,
} from '@heroui/react'

import DefaultLayout from '@/layouts/Default'
import {
  Section,
  Icon,
  MarkdownRenderer,
  PromptArea,
  PageMenuButton,
  Container,
  Icons,
} from '@/components'
import { ExtensionMonacoEditor } from '../components/ExtensionMonacoEditor'
import { useI18n } from '@/i18n'
import { LLMService, type LLMMessage } from '@/lib/llm'
import type { ToolDefinition, LLMConfigWithTools } from '@/lib/llm/types'
import { CredentialService } from '@/lib/credential-service'
import { successToast, errorToast } from '@/lib/toast'
import { db } from '@/lib/db'
import type { HeaderProps, IconName } from '@/lib/types'
import type { CustomExtension, ExtensionColor } from '../types'
import {
  getCustomExtension,
  updateCustomExtension,
  EXTENSION_SYSTEM_PROMPT,
} from '../extension-generator'
import { useMarketplaceStore } from '../store'
import {
  ExtensionPreviewWithConsole,
  type ConsoleEntry,
} from '../components/ExtensionPreviewWithConsole'

// =============================================================================
// I18N STRINGS
// =============================================================================

const localI18n = {
  en: [
    'Extension Editor',
    'Edit and refine your extension',
    'Save',
    'Saving...',
    'Unsaved changes',
    'Extension saved',
    'Failed to save extension',
    'Failed to load extension',
    'Extension not found',
    'Back to Marketplace',
    'Pages',
    'Add Page',
    'Delete Page',
    'Page name',
    'Metadata',
    'Name',
    'Description',
    'Icon',
    'Color',
    'Version',
    'Code',
    'Preview',
    'Console',
    'Chat',
    'Send',
    'No console output',
    'Console output will appear here',
    "Describe what you'd like to change...",
    "Your extension has been created! You can preview it, edit the code directly, or describe changes you'd like me to make.",
    'No LLM provider configured',
    'Sorry, I encountered an error: {error}',
    'Unknown error',
    'Code applied successfully!',
    'Code changes applied',
    'Clear console',
    'Console cleared',
    'Select a page to edit',
    'New page name',
    'Create',
    'Cancel',
    'Delete page?',
    'This action cannot be undone.',
    'Delete',
    'Page created',
    'Page deleted',
    'Enter page route (e.g., settings)',
    'You have unsaved changes. Save before leaving?',
    'error',
    'warn',
    'info',
    'log',
    'Loading...',
    'Chat input',
    'Iconoir icon name',
    'Fix Error',
  ] as const,
  fr: {
    'Extension Editor': "Éditeur d'extension",
    'Edit and refine your extension': 'Modifiez et affinez votre extension',
    Save: 'Enregistrer',
    'Saving...': 'Enregistrement...',
    'Unsaved changes': 'Modifications non enregistrées',
    'Extension saved': 'Extension enregistrée',
    'Failed to save extension': "Échec de l'enregistrement de l'extension",
    'Failed to load extension': "Échec du chargement de l'extension",
    'Extension not found': 'Extension non trouvée',
    'Back to Marketplace': 'Retour au Marketplace',
    Pages: 'Pages',
    'Add Page': 'Ajouter une page',
    'Delete Page': 'Supprimer la page',
    'Page name': 'Nom de la page',
    Metadata: 'Métadonnées',
    Name: 'Nom',
    Description: 'Description',
    Icon: 'Icône',
    Color: 'Couleur',
    Version: 'Version',
    Code: 'Code',
    Preview: 'Prévisualisation',
    Console: 'Console',
    Chat: 'Discussion',
    Send: 'Envoyer',
    'No console output': 'Aucune sortie console',
    'Console output will appear here': 'La sortie console apparaîtra ici',
    "Describe what you'd like to change...":
      'Décrivez ce que vous souhaitez modifier...',
    "Your extension has been created! You can preview it, edit the code directly, or describe changes you'd like me to make.":
      'Votre extension a été créée ! Vous pouvez la prévisualiser, modifier le code directement, ou décrire les modifications que vous souhaitez.',
    'No LLM provider configured': 'Aucun fournisseur LLM configuré',
    'Sorry, I encountered an error: {error}':
      "Désolé, j'ai rencontré une erreur : {error}",
    'Unknown error': 'Erreur inconnue',
    'Code applied successfully!': 'Code appliqué avec succès !',
    'Code changes applied': 'Modifications du code appliquées',
    'Clear console': 'Vider la console',
    'Console cleared': 'Console vidée',
    'Select a page to edit': 'Sélectionnez une page à modifier',
    'New page name': 'Nom de la nouvelle page',
    Create: 'Créer',
    Cancel: 'Annuler',
    'Delete page?': 'Supprimer la page ?',
    'This action cannot be undone.': 'Cette action est irréversible.',
    Delete: 'Supprimer',
    'Page created': 'Page créée',
    'Page deleted': 'Page supprimée',
    'Enter page route (e.g., settings)':
      'Entrez la route de la page (ex. : settings)',
    'You have unsaved changes. Save before leaving?':
      'Vous avez des modifications non enregistrées. Enregistrer avant de quitter ?',
    'Loading...': 'Chargement...',
    'Chat input': 'Entrée de discussion',
    'Iconoir icon name': "Nom d'icône Iconoir",
    'Fix Error': "Corriger l'erreur",
  },
  es: {
    'Extension Editor': 'Editor de extensión',
    'Edit and refine your extension': 'Edita y perfecciona tu extensión',
    Save: 'Guardar',
    'Unsaved changes': 'Cambios sin guardar',
    'Extension saved': 'Extensión guardada',
    'Failed to save extension': 'Error al guardar la extensión',
    'Extension not found': 'Extensión no encontrada',
    'Back to Marketplace': 'Volver al Marketplace',
    Pages: 'Páginas',
    'Add Page': 'Añadir página',
    Code: 'Código',
    Preview: 'Vista previa',
    Console: 'Consola',
    Chat: 'Chat',
  },
  de: {
    'Extension Editor': 'Erweiterungs-Editor',
    'Edit and refine your extension':
      'Bearbeiten und verfeinern Sie Ihre Erweiterung',
    Save: 'Speichern',
    'Extension saved': 'Erweiterung gespeichert',
    Pages: 'Seiten',
    Code: 'Code',
    Preview: 'Vorschau',
    Console: 'Konsole',
    Chat: 'Chat',
  },
}

// =============================================================================
// TYPES
// =============================================================================

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  codeApplied?: boolean
}

// =============================================================================
// AGENT TOOLS
// =============================================================================

const APPLY_CODE_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'apply_code',
    description:
      'Apply code changes to the current page of the extension. Use this tool to update the extension code when the user requests changes. Always provide the COMPLETE updated code, not partial snippets.',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description:
            'The complete updated JavaScript/JSX code for the extension page. Must define an App component.',
        },
        explanation: {
          type: 'string',
          description:
            'A brief explanation of what changes were made to the code.',
        },
      },
      required: ['code', 'explanation'],
    },
    strict: true,
  },
}

const GET_CONSOLE_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_console_output',
    description:
      'Get the console output from the extension preview. Use this to debug issues or understand what errors the extension is producing.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    strict: true,
  },
}

const UPDATE_METADATA_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'update_metadata',
    description:
      'Update the extension metadata (name, description, icon, color, version).',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The display name of the extension.',
        },
        description: {
          type: 'string',
          description: 'A brief description of what the extension does.',
        },
        icon: {
          type: 'string',
          description: 'The Iconoir icon name (e.g., Code, Sparks, Settings).',
        },
        color: {
          type: 'string',
          description:
            'The color theme (primary, secondary, success, warning, danger, etc.).',
        },
        version: {
          type: 'string',
          description: 'Semantic version (e.g., 1.0.0).',
        },
      },
      required: [],
    },
    strict: true,
  },
}

const EDITOR_SYSTEM_PROMPT = /* md */ `You are an expert extension developer helping to refine a DEVS marketplace extension.

Your role is to:
1. Understand user requirements and feedback
2. Suggest and apply code improvements
3. Fix bugs or issues reported
4. Add new features requested
5. Debug issues using console output

You have access to specialized tools:

## apply_code
Use this to update the extension code. ALWAYS provide the COMPLETE updated code.

## get_console_output
Use this to retrieve console logs, errors, and warnings from the extension preview.
Helpful for debugging runtime issues.

## update_metadata
Use this to update extension metadata like name, description, icon, color, or version.

IMPORTANT:
- Always use the tools for any modifications - don't just show code in responses
- When debugging, first get the console output to understand the error
- Provide clear explanations of changes made

## EXTENSION DEVELOPMENT REFERENCE

${EXTENSION_SYSTEM_PROMPT}
`

// =============================================================================
// COLOR OPTIONS
// =============================================================================

const COLOR_OPTIONS: ExtensionColor[] = [
  'default',
  'primary',
  'secondary',
  'success',
  'warning',
  'danger',
  'info',
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'indigo',
  'purple',
  'pink',
  'gray',
]

// =============================================================================
// COMPONENT
// =============================================================================

export function ExtensionEditorPage() {
  const { lang, t } = useI18n(localI18n)
  const navigate = useNavigate()
  const { extensionId } = useParams<{ extensionId: string }>()
  const [searchParams] = useSearchParams()
  const isNewExtension = searchParams.get('new') === 'true'
  const isDuplicate = searchParams.get('duplicate') === 'true'

  // Extension state
  const [extension, setExtension] = useState<CustomExtension | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Page editing state
  const [selectedPage, setSelectedPage] = useState<string>('')
  const [pageCode, setPageCode] = useState<string>('')
  const [editorKey, setEditorKey] = useState(0)

  // Console state
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([])

  // Track the latest error for the floating fix button
  const latestError = useMemo(
    () => consoleEntries.filter((e) => e.type === 'error').slice(-1)[0],
    [consoleEntries],
  )

  // Code panel collapsed state (collapsed by default)
  const [isCodePanelCollapsed, setIsCodePanelCollapsed] = useState(true)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isConversationVisible, setIsConversationVisible] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationContainerRef = useRef<HTMLDivElement>(null)
  const isClickingInsideRef = useRef(false)

  // Track if extension has been loaded to prevent re-loading on URL param changes
  const hasLoadedRef = useRef(false)
  // Track if we're currently creating a new extension (guards against StrictMode double-run)
  const isCreatingRef = useRef(false)

  // Modal state for new page
  const {
    isOpen: isNewPageOpen,
    onOpen: onNewPageOpen,
    onClose: onNewPageClose,
  } = useDisclosure()
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure()
  const [newPageName, setNewPageName] = useState('')

  // Get store methods
  const loadCustomExtensions = useMarketplaceStore(
    (state) => state.loadCustomExtensions,
  )
  const loadExtensionById = useMarketplaceStore(
    (state) => state.loadExtensionById,
  )

  // Page keys
  const pageKeys = useMemo(() => {
    if (!extension?.pages) return []
    return Object.keys(extension.pages)
  }, [extension?.pages])

  const icons = useMemo(
    () =>
      Object.keys(Icons).map((name) => ({
        key: name,
        label: name,
        icon: name as IconName,
      })),
    [],
  )

  // ==========================================================================
  // LOAD EXTENSION
  // ==========================================================================

  useEffect(() => {
    async function loadExtension() {
      if (!extensionId) {
        setIsLoading(false)
        return
      }

      // Prevent re-loading if already loaded (avoids rollback on URL param changes)
      if (hasLoadedRef.current && extensionId !== 'new' && !isDuplicate) {
        return
      }

      try {
        // Handle manual creation: create a blank extension from scratch
        if (extensionId === 'new') {
          // Guard against StrictMode double-run or multiple navigations
          if (isCreatingRef.current) {
            return
          }
          isCreatingRef.current = true

          const newId = `custom-extension-${Date.now().toString(36)}`
          const blankExtension: CustomExtension = {
            id: newId,
            name: 'My Extension',
            version: '1.0.0',
            type: 'app',
            license: 'MIT',
            description: 'A custom extension',
            icon: 'Code',
            color: 'primary',
            pages: {
              app: `import { Button, Card, CardBody, Container, Section } from '@devs/components'

const App = () => {
  return (
    <Section>
      <Container className="max-w-2xl">
        <Card>
          <CardBody className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">My Extension</h1>
            <p className="text-default-500 mb-6">
              Start building your extension here!
            </p>
            <Button color="primary">
              Get Started
            </Button>
          </CardBody>
        </Card>
      </Container>
    </Section>
  )
}
`,
            },
            generationPrompt: '',
            createdAt: new Date(),
            enabled: true,
          }

          // Save to IndexedDB
          if (!db.isInitialized()) {
            await db.init()
          }
          await db.update('customExtensions', blankExtension)

          // Reload custom extensions in the store
          await loadCustomExtensions()

          // Navigate to the new extension's edit page
          navigate(`/marketplace/edit/${newId}?new=true`, { replace: true })
          return
        }

        // Handle duplication: load extension, create a copy, and navigate to the new one
        if (isDuplicate) {
          // Guard against StrictMode double-run or multiple navigations
          if (isCreatingRef.current) {
            return
          }
          isCreatingRef.current = true

          // Remove the duplicate query param immediately to prevent re-triggering
          navigate(`/marketplace/edit/${extensionId}`, { replace: true })

          const sourceExt = await loadExtensionById(extensionId)
          if (sourceExt) {
            // Create a unique ID for the duplicate
            const newId = `${extensionId}-copy-${Date.now().toString(36)}`
            const duplicatedExtension: CustomExtension = {
              id: newId,
              name: `${sourceExt.name} (copy)`,
              version: '1.0.0',
              type: sourceExt.type || 'app',
              license: sourceExt.license || 'MIT',
              description: sourceExt.description,
              icon: sourceExt.icon,
              color: sourceExt.color,
              pages: sourceExt.pages || {},
              configuration: sourceExt.configuration,
              i18n: sourceExt.i18n,
              author: sourceExt.author,
              generationPrompt: `Duplicated from ${sourceExt.name}`,
              createdAt: new Date(),
              enabled: true,
            }

            // Save to IndexedDB
            if (!db.isInitialized()) {
              await db.init()
            }
            await db.update('customExtensions', duplicatedExtension)

            // Reload custom extensions in the store
            await loadCustomExtensions()

            // Navigate to the new extension's edit page (without duplicate param)
            navigate(`/marketplace/edit/${newId}?new=true`, { replace: true })
            return
          } else {
            errorToast(t('Extension not found'))
            setIsLoading(false)
            return
          }
        }

        // Normal loading: load custom extension by ID
        const ext = await getCustomExtension(extensionId)
        if (ext) {
          setExtension(ext)
          const pages = ext.pages || {}
          const firstPageKey = Object.keys(pages)[0] || ''
          setSelectedPage(firstPageKey)
          setPageCode(pages[firstPageKey] || '')
          hasLoadedRef.current = true

          if (isNewExtension) {
            // Remove the new query param to prevent re-triggering
            navigate(`/marketplace/edit/${extensionId}`, { replace: true })

            setMessages([
              {
                id: 'welcome',
                role: 'assistant',
                content: t(
                  "Your extension has been created! You can preview it, edit the code directly, or describe changes you'd like me to make.",
                ),
                timestamp: new Date(),
              },
            ])
          }
        }
      } catch (error) {
        console.error('Failed to load extension:', error)
        errorToast(t('Failed to load extension'))
      } finally {
        setIsLoading(false)
      }
    }

    loadExtension()
  }, [
    extensionId,
    isNewExtension,
    isDuplicate,
    loadExtensionById,
    loadCustomExtensions,
    navigate,
    t,
  ])

  // ==========================================================================
  // PAGE SELECTION
  // ==========================================================================

  const handlePageSelect = useCallback(
    (pageKey: string) => {
      if (!extension?.pages) return
      setSelectedPage(pageKey)
      setPageCode(extension.pages[pageKey] || '')
      setEditorKey((k) => k + 1)
    },
    [extension?.pages],
  )

  // ==========================================================================
  // CODE CHANGES
  // ==========================================================================

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined && selectedPage) {
        setPageCode(value)
        // Keep extension.pages in sync with code changes
        setExtension((prev) =>
          prev
            ? {
                ...prev,
                pages: {
                  ...prev.pages,
                  [selectedPage]: value,
                },
              }
            : null,
        )
        setHasUnsavedChanges(true)
      }
    },
    [selectedPage],
  )

  // ==========================================================================
  // CONSOLE HANDLING
  // ==========================================================================

  const handleConsoleMessage = useCallback((entry: ConsoleEntry) => {
    setConsoleEntries((prev) => [...prev, entry])
  }, [])

  const handleClearConsole = useCallback(() => {
    setConsoleEntries([])
    successToast(t('Console cleared'))
  }, [t])

  // Clear console when preview refreshes (code or theme changes)
  const handlePreviewRefresh = useCallback(() => {
    setConsoleEntries([])
  }, [])

  // ==========================================================================
  // METADATA CHANGES
  // ==========================================================================

  const handleMetadataChange = useCallback(
    (field: keyof CustomExtension, value: string) => {
      setExtension((prev) => {
        if (!prev) return null
        return { ...prev, [field]: value }
      })
      setHasUnsavedChanges(true)
    },
    [],
  )

  // ==========================================================================
  // SAVE
  // ==========================================================================

  const handleSave = useCallback(async () => {
    if (!extension || !selectedPage) return

    setIsSaving(true)
    try {
      const updatedExtension: CustomExtension = {
        ...extension,
        pages: {
          ...extension.pages,
          [selectedPage]: pageCode,
        },
      }
      await updateCustomExtension(updatedExtension)
      setExtension(updatedExtension)
      setHasUnsavedChanges(false)
      await loadCustomExtensions()
      successToast(t('Extension saved'))
    } catch (error) {
      console.error('Failed to save extension:', error)
      errorToast(t('Failed to save extension'))
    } finally {
      setIsSaving(false)
    }
  }, [extension, selectedPage, pageCode, loadCustomExtensions, t])

  // ==========================================================================
  // PAGE MANAGEMENT
  // ==========================================================================

  const handleAddPage = useCallback(() => {
    if (!extension || !newPageName.trim()) return

    const pageKey = newPageName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    const defaultCode = /* js */ `import { Button, Card, CardBody, Container, Section } from '@devs/components'

const App = () => {
  return (
    <Section>
      <Container>
        <Card>
          <CardBody>
            <p>New page: ${newPageName}</p>
          </CardBody>
        </Card>
      </Container>
    </Section>
  )
}`

    setExtension((prev) =>
      prev
        ? {
            ...prev,
            pages: {
              ...prev.pages,
              [pageKey]: defaultCode,
            },
          }
        : null,
    )
    setSelectedPage(pageKey)
    setPageCode(defaultCode)
    setHasUnsavedChanges(true)
    setNewPageName('')
    onNewPageClose()
    successToast(t('Page created'))
  }, [extension, newPageName, onNewPageClose, t])

  const handleDeletePage = useCallback(() => {
    if (!extension || !selectedPage || pageKeys.length <= 1) return

    const { [selectedPage]: _, ...remainingPages } = extension.pages || {}
    const newSelectedPage = Object.keys(remainingPages)[0] || ''

    setExtension((prev) =>
      prev
        ? {
            ...prev,
            pages: remainingPages,
          }
        : null,
    )
    setSelectedPage(newSelectedPage)
    setPageCode(remainingPages[newSelectedPage] || '')
    setHasUnsavedChanges(true)
    onDeleteClose()
    successToast(t('Page deleted'))
  }, [extension, selectedPage, pageKeys.length, onDeleteClose, t])

  // ==========================================================================
  // CHAT / AI INTERACTION
  // ==========================================================================

  const handleSendMessage = useCallback(
    async (overrideMessage?: string) => {
      const messageToSend = overrideMessage || chatInput.trim()
      if (!messageToSend || isGenerating || !extension) return

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: messageToSend,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setChatInput('')
      setIsGenerating(true)

      const assistantMessageId = crypto.randomUUID()
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])

      try {
        const config = await CredentialService.getActiveConfig()
        if (!config) {
          throw new Error(t('No LLM provider configured'))
        }

        const contextPrompt = `
Current extension: ${extension.name}
Description: ${extension.description || 'No description'}
Current page: ${selectedPage}

Current page code:
\`\`\`jsx
${pageCode}
\`\`\`

Available pages: ${pageKeys.join(', ')}

User request: ${userMessage.content}
`

        const llmMessages: LLMMessage[] = [
          { role: 'system', content: EDITOR_SYSTEM_PROMPT },
          { role: 'user', content: contextPrompt },
        ]

        const recentMessages = messages.slice(-6)
        for (const msg of recentMessages) {
          llmMessages.push({
            role: msg.role,
            content: msg.content,
          })
        }

        llmMessages.push({
          role: 'user',
          content: userMessage.content,
        })

        const configWithTools: LLMConfigWithTools & typeof config = {
          ...config,
          tools: [APPLY_CODE_TOOL, GET_CONSOLE_TOOL, UPDATE_METADATA_TOOL],
          tool_choice: 'auto',
        }

        // Use non-streaming chat for proper tool call handling
        const response = await LLMService.chat(llmMessages, configWithTools)

        let responseContent = response.content || ''

        // Handle tool calls if present
        if (response.tool_calls && response.tool_calls.length > 0) {
          for (const toolCall of response.tool_calls) {
            const toolName = toolCall.function?.name

            if (toolName === 'apply_code') {
              const args = JSON.parse(toolCall.function.arguments || '{}') as {
                code: string
                explanation: string
              }

              setPageCode(args.code)
              setEditorKey((k) => k + 1)
              setHasUnsavedChanges(true)

              responseContent += `\n\n✅ ${t('Code applied successfully!')}\n\n${args.explanation}`
              successToast(t('Code changes applied'))
            } else if (toolName === 'get_console_output') {
              const consoleOutput = consoleEntries
                .map((e) => `[${e.type.toUpperCase()}] ${e.message}`)
                .join('\n')

              responseContent += `\n\nConsole output:\n\`\`\`\n${consoleOutput || 'No console output'}\n\`\`\``
            } else if (toolName === 'update_metadata') {
              const args = JSON.parse(
                toolCall.function.arguments || '{}',
              ) as Partial<{
                name: string
                description: string
                icon: string
                color: string
                version: string
              }>
              const updates: Partial<CustomExtension> = {}

              if (args.name) updates.name = args.name
              if (args.description) updates.description = args.description
              if (args.icon) updates.icon = args.icon as IconName
              if (args.color) updates.color = args.color as ExtensionColor
              if (args.version) updates.version = args.version

              setExtension((prev) => (prev ? { ...prev, ...updates } : null))
              setHasUnsavedChanges(true)

              const changedFields = Object.keys(updates).join(', ')
              responseContent += `\n\n✅ Metadata updated: ${changedFields}`
            }
          }
        }

        // Update the assistant message with final content
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: responseContent.trim() || 'Done!' }
              : msg,
          ),
        )
      } catch (error) {
        console.error('Failed to get AI response:', error)
        const errorMessage =
          error instanceof Error ? error.message : t('Unknown error')

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? {
                  ...msg,
                  content: t('Sorry, I encountered an error: {error}', {
                    error: errorMessage,
                  }),
                }
              : msg,
          ),
        )
      } finally {
        setIsGenerating(false)
      }
    },
    [
      chatInput,
      isGenerating,
      extension,
      selectedPage,
      pageCode,
      pageKeys,
      messages,
      consoleEntries,
      t,
    ],
  )

  // Wrapper for onSubmit prop (handles form events)
  const handleSubmit = useCallback(() => {
    handleSendMessage()
  }, [handleSendMessage])

  // Fix error by sending it to the AI
  const handleFixError = useCallback(() => {
    if (!latestError) return
    const errorPrompt = `Fix this error: ${latestError.message}`
    handleSendMessage(errorPrompt)
  }, [latestError, handleSendMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle focus/blur for conversation visibility
  const handleConversationFocus = useCallback(() => {
    setIsConversationVisible(true)
  }, [])

  const handleConversationBlur = useCallback(() => {
    // Check if the new focus target is still within the conversation container
    // Use a small timeout to allow click events to complete first
    setTimeout(() => {
      // Don't hide if we're clicking inside the container
      if (isClickingInsideRef.current) {
        isClickingInsideRef.current = false
        return
      }
      if (
        conversationContainerRef.current &&
        !conversationContainerRef.current.contains(document.activeElement)
      ) {
        setIsConversationVisible(false)
      }
    }, 150)
  }, [])

  const handleConversationMouseDown = useCallback(() => {
    isClickingInsideRef.current = true
    setIsConversationVisible(true)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  // const handleDone = useCallback(() => {
  //   if (hasUnsavedChanges) {
  //     if (window.confirm(t('You have unsaved changes. Save before leaving?'))) {
  //       handleSave().then(() => navigate('/marketplace'))
  //     } else {
  //       navigate('/marketplace')
  //     }
  //   } else {
  //     navigate('/marketplace')
  //   }
  // }, [hasUnsavedChanges, handleSave, navigate, t])

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  if (isLoading) {
    return (
      <DefaultLayout>
        <Section>
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" label={t('Loading...')} />
          </div>
        </Section>
      </DefaultLayout>
    )
  }

  if (!extension) {
    return (
      <DefaultLayout>
        <Section>
          <div className="text-center py-16">
            <Icon
              name="WarningTriangle"
              className="w-16 h-16 mx-auto mb-4 text-warning-500"
            />
            <h2 className="text-xl font-semibold mb-4">
              {t('Extension not found')}
            </h2>
            <Button
              color="primary"
              variant="flat"
              onPress={() => navigate('/marketplace')}
            >
              {t('Back to Marketplace')}
            </Button>
          </div>
        </Section>
      </DefaultLayout>
    )
  }

  // ==========================================================================
  // HEADER
  // ==========================================================================

  const header: HeaderProps = {
    icon: {
      name: (extension.icon as IconName) || 'Code',
      color: 'text-warning-400 dark:text-warning-500',
    },
    title: extension.name,
    subtitle: t('Edit and refine your extension'),
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <DefaultLayout
      header={header}
      pageMenuActions={
        <>
          {/* Metadata */}
          <Popover placement="bottom-end">
            <PageMenuButton
              icon="Settings"
              tooltip={t('Metadata')}
              ariaLabel={t('Metadata')}
            />
            <PopoverContent className="p-0">
              <Card>
                <CardBody className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label={t('Name')}
                      value={extension.name}
                      onValueChange={(v) => handleMetadataChange('name', v)}
                      aria-label={t('Name')}
                    />
                    <div className="flex gap-4">
                      <Dropdown
                        placement="bottom-end"
                        aria-label={t('Icon')}
                        className="flex-1"
                      >
                        <DropdownTrigger>
                          <Button
                            radius="full"
                            variant="light"
                            size="sm"
                            startContent={
                              <Icon
                                name={extension.icon as IconName}
                                size="sm"
                                className="hidden md:flex text-default-500 dark:text-default-600"
                              />
                            }
                          >
                            <span className="text-xs truncate max-w-22 md:max-w-48">
                              {extension.icon || t('Icon')}
                            </span>
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                          aria-label={t('Icon')}
                          selectionMode="single"
                          selectedKeys={extension.icon ? [extension.icon] : []}
                          onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as string
                            if (selected) handleMetadataChange('icon', selected)
                          }}
                          className="max-h-80 overflow-y-auto w-64"
                          items={icons}
                        >
                          {(item) => (
                            <DropdownItem
                              key={item.key}
                              startContent={<Icon name={item.icon} size="sm" />}
                            >
                              {item.label}
                            </DropdownItem>
                          )}
                        </DropdownMenu>
                      </Dropdown>
                      <Input
                        label={t('Version')}
                        value={extension.version || '1.0.0'}
                        onValueChange={(v) =>
                          handleMetadataChange('version', v)
                        }
                        placeholder="1.0.0"
                        aria-label={t('Version')}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <Textarea
                    label={t('Description')}
                    value={extension.description || ''}
                    onValueChange={(v) =>
                      handleMetadataChange('description', v)
                    }
                    aria-label={t('Description')}
                  />
                  <Select
                    label={t('Color')}
                    selectedKeys={
                      extension.color ? [extension.color] : ['default']
                    }
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string
                      handleMetadataChange('color', selected)
                    }}
                    aria-label={t('Color')}
                    className="max-w-xs"
                  >
                    {COLOR_OPTIONS.map((color) => (
                      <SelectItem key={color}>{color}</SelectItem>
                    ))}
                  </Select>
                </CardBody>
              </Card>
            </PopoverContent>
          </Popover>
        </>
      }
    >
      <Section size={7} mainClassName="h-full" className="h-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Chip size="sm" color="warning" variant="flat">
                {t('Unsaved changes')}
              </Chip>
            )}
          </div>
          <div className="flex items-center gap-2">
            {latestError && (
              <Button
                color="danger"
                variant="flat"
                size="sm"
                startContent={<Icon name="Wrench" size="sm" />}
                onPress={handleFixError}
                isDisabled={isGenerating}
              >
                {t('Fix Error')}
              </Button>
            )}
            <Button
              size="sm"
              variant="flat"
              onPress={handleSave}
              isLoading={isSaving}
              isDisabled={!hasUnsavedChanges}
              startContent={<Icon name="FloppyDisk" size="sm" />}
            >
              {t('Save')}
            </Button>
          </div>
        </div>

        {/* Main Content - Two column layout on desktop, full width when code collapsed */}
        <div
          className={`relative grid gap-4 mb-4 h-full ${
            isCodePanelCollapsed ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
          }`}
        >
          {/* Left Column: Preview + Console */}
          <div className="flex flex-col gap-4">
            {/* Preview Card */}
            <Card className="flex-grow">
              <CardHeader className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2">
                  <Icon name="Eye" size="sm" />
                  <span className="text-sm font-medium">{t('Preview')}</span>
                </div>
              </CardHeader>
              <Divider />
              <CardBody className="p-0">
                <ExtensionPreviewWithConsole
                  extensionId={extension.id}
                  extensionName={extension.name}
                  pageCode={pageCode}
                  i18n={extension.i18n}
                  onConsoleMessage={handleConsoleMessage}
                  onPreviewRefresh={handlePreviewRefresh}
                  className="min-h-[300px]"
                />
              </CardBody>
            </Card>

            {/* Console Card */}
            <Card>
              <CardHeader className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2">
                  <Icon name="Terminal" size="sm" />
                  <span className="text-sm font-medium">{t('Console')}</span>
                  {consoleEntries.length > 0 && (
                    <Chip size="sm" color="default" variant="flat">
                      {consoleEntries.length}
                    </Chip>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="light"
                  onPress={handleClearConsole}
                  isDisabled={consoleEntries.length === 0}
                >
                  {t('Clear console')}
                </Button>
              </CardHeader>
              <Divider />
              <CardBody className="p-0">
                <ScrollShadow className="h-32 p-3 font-mono text-xs">
                  {consoleEntries.length === 0 ? (
                    <p className="text-default-400">
                      {t('Console output will appear here')}
                    </p>
                  ) : (
                    consoleEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`py-0.5 whitespace-pre-wrap break-all ${
                          entry.type === 'error'
                            ? 'text-danger'
                            : entry.type === 'warn'
                              ? 'text-warning'
                              : entry.type === 'info'
                                ? 'text-primary'
                                : 'text-foreground'
                        }`}
                      >
                        <span className="text-default-400 mr-2">
                          [{t(entry.type)}]
                        </span>
                        {entry.message}
                      </div>
                    ))
                  )}
                </ScrollShadow>
              </CardBody>
            </Card>
          </div>

          {/* Right Column: Code Editor (Collapsible) */}
          <Card
            className={
              isCodePanelCollapsed
                ? 'absolute right-0 2xl:-right-16 top-0 h-fit w-12 z-10'
                : 'h-fit'
            }
          >
            <CardHeader
              className={`cursor-pointer select-none py-2 ${
                isCodePanelCollapsed
                  ? 'flex justify-center'
                  : 'flex flex-col gap-3'
              }`}
              onClick={() => setIsCodePanelCollapsed(!isCodePanelCollapsed)}
            >
              {isCodePanelCollapsed ? (
                /* Collapsed: Show only icon */
                <Icon name="Code" size="sm" />
              ) : (
                /* Expanded: Show full header */
                <>
                  {/* Pages Row */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Icon name="Code" size="sm" />
                      <span className="text-sm font-medium">{t('Code')}</span>
                    </div>
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="light"
                        onPress={onNewPageOpen}
                        startContent={<Icon name="Plus" size="sm" />}
                      >
                        {t('Add Page')}
                      </Button>
                      {pageKeys.length > 1 && (
                        <Button
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={onDeleteOpen}
                          isIconOnly
                          aria-label={t('Delete Page')}
                        >
                          <Icon name="Trash" size="sm" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Page Tabs */}
                  <div
                    className="flex flex-wrap gap-1 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {pageKeys.map((pageKey) => (
                      <Chip
                        key={pageKey}
                        size="sm"
                        color={selectedPage === pageKey ? 'primary' : 'default'}
                        variant={selectedPage === pageKey ? 'solid' : 'flat'}
                        className="cursor-pointer"
                        onClick={() => handlePageSelect(pageKey)}
                      >
                        {pageKey}
                      </Chip>
                    ))}
                  </div>
                </>
              )}
            </CardHeader>
            {!isCodePanelCollapsed && (
              <>
                <Divider />
                <CardBody className="p-0 h-[450px]">
                  <ExtensionMonacoEditor
                    editorKey={editorKey}
                    value={pageCode}
                    onChange={handleCodeChange}
                  />
                </CardBody>
              </>
            )}
          </Card>
        </div>

        {/* Bottom Accordion: Chat & Metadata */}
        {/* Chat Section */}
        <div
          ref={conversationContainerRef}
          className="absolute left-0 right-0 bottom-8 z-20 pt-2"
          onFocus={handleConversationFocus}
          onBlur={handleConversationBlur}
          onMouseDown={handleConversationMouseDown}
        >
          <Container>
            <ScrollShadow
              className={`max-h-48 space-y-4 overflow-y-auto scrollbar-hide transition-opacity duration-200 ${
                isConversationVisible || isGenerating
                  ? 'opacity-100'
                  : 'opacity-0 pointer-events-none h-0'
              }`}
            >
              {messages.length === 0
                ? null
                : messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === 'user'
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-2 rounded-large ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-content2 text-foreground'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>
                        ) : isGenerating ? (
                          <Spinner size="sm" />
                        ) : (
                          <MarkdownRenderer
                            content={message.content}
                            className="text-sm"
                          />
                        )}
                      </div>
                    </div>
                  ))}

              <div ref={messagesEndRef} />
            </ScrollShadow>

            <div className="flex gap-2">
              <PromptArea
                lang={lang}
                minRows={1}
                placeholder={t("Describe what you'd like to change...")}
                withAgentSelector={false}
                withAttachmentSelector={false}
                isDisabled={isGenerating}
                value={chatInput}
                onValueChange={setChatInput}
                onKeyDown={handleKeyDown}
                aria-label={t('Chat input')}
                onSubmit={handleSubmit}
                autoFocus
              />
            </div>
          </Container>
        </div>

        {/* New Page Modal */}
        <Modal isOpen={isNewPageOpen} onClose={onNewPageClose}>
          <ModalContent>
            <ModalHeader>{t('Add Page')}</ModalHeader>
            <ModalBody>
              <Input
                label={t('New page name')}
                placeholder={t('Enter page route (e.g., settings)')}
                value={newPageName}
                onValueChange={setNewPageName}
                aria-label={t('New page name')}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onNewPageClose}>
                {t('Cancel')}
              </Button>
              <Button
                color="primary"
                onPress={handleAddPage}
                isDisabled={!newPageName.trim()}
              >
                {t('Create')}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Delete Page Modal */}
        <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
          <ModalContent>
            <ModalHeader>{t('Delete page?')}</ModalHeader>
            <ModalBody>
              <p>{t('This action cannot be undone.')}</p>
              <p className="font-medium mt-2">{selectedPage}</p>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onDeleteClose}>
                {t('Cancel')}
              </Button>
              <Button color="danger" onPress={handleDeletePage}>
                {t('Delete')}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Section>
    </DefaultLayout>
  )
}

export default ExtensionEditorPage
