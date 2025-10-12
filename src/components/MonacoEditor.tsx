import { useEffect } from 'react'
import Editor, { Monaco, useMonaco } from '@monaco-editor/react'
import configureMonacoMermaid from 'monaco-mermaid'
import { configureMonacoYaml } from 'monaco-yaml'
import { userSettings } from '@/stores/userStore'

interface YamlEditorProps {
  defaultLanguage?: string
  defaultValue?: string
  onChange?: (value: string | undefined) => void
}

export const MonacoEditor = ({
  defaultLanguage,
  defaultValue,
  onChange,
}: YamlEditorProps) => {
  const { isDarkTheme } = userSettings()

  const monaco = useMonaco()

  useEffect(() => {
    if (monaco) {
      console.log('Monaco instance:', monaco)
    }
  }, [monaco])

  const handleEditorWillMount = (monaco: Monaco) => {
    // here is the monaco instance
    // do something before editor is mounted
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true)

    configureMonacoMermaid(monaco)
    configureMonacoYaml(monaco, {
      enableSchemaRequest: true,
      schemas: [
        {
          // If YAML file is opened matching this glob
          fileMatch: ['**/*.methodology.yaml'],
          // Then this schema will be downloaded from the internet and used.
          uri: '/schemas/methodology.schema.json',
        },
      ],
    })
  }

  const handleEditorDidMount = (_editor: any, monaco: Monaco) => {
    monaco.editor.setTheme(isDarkTheme() ? 'vs-dark' : 'vs-light')
  }

  return (
    <Editor
      className="w-full h-full min-h-100"
      defaultLanguage={defaultLanguage}
      defaultValue={defaultValue}
      beforeMount={handleEditorWillMount}
      onChange={onChange}
      onMount={handleEditorDidMount}
      options={{
        // lineNumbers: 'off',
        minimap: {
          enabled: false,
        },
        fontSize: 14,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  )
}
