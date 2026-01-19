/**
 * Extension Monaco Editor
 *
 * A specialized Monaco editor for DEVS extension development.
 * Provides IntelliSense for:
 * - @devs/components package (HeroUI + custom components)
 * - DEVS global API (LLM, UI, storage, agents, etc.)
 * - React/JSX types
 */

import { useEffect, useCallback } from 'react'
import Editor, { Monaco, useMonaco } from '@monaco-editor/react'
import { userSettings } from '@/stores/userStore'
import {
  DEVS_TYPES,
  DEVS_COMPONENTS_TYPES,
  REACT_TYPES,
} from '../extension-types'

interface ExtensionEditorProps {
  /** Controlled value */
  value?: string
  /** Default value (uncontrolled) */
  defaultValue?: string
  /** Called when content changes */
  onChange?: (value: string | undefined) => void
  /** Force re-render by changing this key */
  editorKey?: number
}

/**
 * Monaco editor configured for DEVS extension development
 * with full IntelliSense for @devs/components and DEVS global
 */
export function ExtensionMonacoEditor({
  value,
  defaultValue,
  onChange,
  editorKey,
}: ExtensionEditorProps) {
  const { isDarkTheme } = userSettings()
  const monaco = useMonaco()

  // Configure TypeScript/JavaScript compiler options and add type definitions
  const configureMonaco = useCallback((monacoInstance: Monaco) => {
    const jsDefaults = monacoInstance.languages.typescript.javascriptDefaults

    // Configure compiler options for JSX support
    jsDefaults.setCompilerOptions({
      target: monacoInstance.languages.typescript.ScriptTarget.ESNext,
      module: monacoInstance.languages.typescript.ModuleKind.ESNext,
      moduleResolution:
        monacoInstance.languages.typescript.ModuleResolutionKind.NodeJs,
      jsx: monacoInstance.languages.typescript.JsxEmit.React,
      jsxFactory: 'React.createElement',
      jsxFragmentFactory: 'React.Fragment',
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: true,
      strict: false,
      noEmit: true,
      esModuleInterop: true,
      skipLibCheck: true,
      allowSyntheticDefaultImports: true,
      lib: ['ESNext', 'DOM', 'DOM.Iterable'],
    })

    // Set diagnostic options
    jsDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    })

    // Enable eager model sync for better IntelliSense
    jsDefaults.setEagerModelSync(true)

    // Add DEVS global types
    jsDefaults.addExtraLib(DEVS_TYPES, 'ts:devs-global.d.ts')

    // Add @devs/components types
    jsDefaults.addExtraLib(DEVS_COMPONENTS_TYPES, 'ts:devs-components.d.ts')

    // Add React types
    jsDefaults.addExtraLib(REACT_TYPES, 'ts:react.d.ts')

    // Also configure TypeScript defaults (for .tsx files)
    const tsDefaults = monacoInstance.languages.typescript.typescriptDefaults

    tsDefaults.setCompilerOptions({
      target: monacoInstance.languages.typescript.ScriptTarget.ESNext,
      module: monacoInstance.languages.typescript.ModuleKind.ESNext,
      moduleResolution:
        monacoInstance.languages.typescript.ModuleResolutionKind.NodeJs,
      jsx: monacoInstance.languages.typescript.JsxEmit.React,
      jsxFactory: 'React.createElement',
      jsxFragmentFactory: 'React.Fragment',
      allowNonTsExtensions: true,
      strict: false,
      noEmit: true,
      esModuleInterop: true,
      skipLibCheck: true,
      allowSyntheticDefaultImports: true,
      lib: ['ESNext', 'DOM', 'DOM.Iterable'],
    })

    tsDefaults.addExtraLib(DEVS_TYPES, 'ts:devs-global.d.ts')
    tsDefaults.addExtraLib(DEVS_COMPONENTS_TYPES, 'ts:devs-components.d.ts')
    tsDefaults.addExtraLib(REACT_TYPES, 'ts:react.d.ts')

    console.log(
      '[ExtensionMonacoEditor] Type definitions loaded for DEVS extensions',
    )
  }, [])

  // Handle before mount - configure Monaco
  const handleEditorWillMount = useCallback(
    (monacoInstance: Monaco) => {
      configureMonaco(monacoInstance)
    },
    [configureMonaco],
  )

  // Handle after mount - set theme
  const handleEditorDidMount = useCallback(
    (_editor: any, monacoInstance: Monaco) => {
      monacoInstance.editor.setTheme(isDarkTheme() ? 'vs-dark' : 'vs-light')
    },
    [isDarkTheme],
  )

  // Re-apply theme when it changes
  useEffect(() => {
    if (monaco) {
      monaco.editor.setTheme(isDarkTheme() ? 'vs-dark' : 'vs-light')
    }
  }, [monaco, isDarkTheme])

  return (
    <Editor
      key={editorKey}
      className="w-full h-full min-h-100"
      defaultLanguage="javascript"
      language="javascript"
      defaultValue={defaultValue}
      value={value}
      beforeMount={handleEditorWillMount}
      onMount={handleEditorDidMount}
      onChange={onChange}
      options={{
        minimap: {
          enabled: false,
        },
        fontSize: 14,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        insertSpaces: true,
        formatOnPaste: true,
        formatOnType: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: {
          other: true,
          comments: false,
          strings: true,
        },
        parameterHints: {
          enabled: true,
        },
        suggest: {
          showKeywords: true,
          showSnippets: true,
          showClasses: true,
          showFunctions: true,
          showVariables: true,
          showConstants: true,
          showProperties: true,
          showMethods: true,
          showModules: true,
          showInterfaces: true,
          showEvents: true,
          showOperators: true,
          showTypeParameters: true,
          preview: true,
          previewMode: 'subwordSmart',
        },
        hover: {
          enabled: true,
          delay: 300,
        },
      }}
    />
  )
}

export default ExtensionMonacoEditor
