#!/usr/bin/env node
import { readdir, writeFile, readFile, mkdir, copyFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYAML } from 'yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const agentsDir = join(__dirname, '../../public/agents')
const manifestPath = join(agentsDir, 'manifest.json')

const wasmSrcDir = join(
  __dirname,
  '../../node_modules/@mediapipe/tasks-genai/wasm',
)
const wasmDestDir = join(__dirname, '../../public/wasm/mediapipe-genai')
const wasmStampPath = join(wasmDestDir, '.version')

/**
 * Mirror the MediaPipe GenAI WASM runtime into public/ so the local (WebGPU)
 * provider can fetch it at `/wasm/mediapipe-genai` — see
 * `FilesetResolver.forGenAiTasks()` in src/lib/llm/providers/local.ts.
 *
 * These ~76 MB of binaries ship inside the `@mediapipe/tasks-genai` package, so
 * they are a build artifact of a declared dependency, not source. Copying them
 * here keeps them out of git history (where their size would be permanent) and
 * guarantees they always match the installed version instead of silently
 * drifting after an upgrade.
 */
async function syncMediaPipeWasm() {
  let version
  try {
    const pkg = await readFile(join(wasmSrcDir, '../package.json'), 'utf8')
    version = JSON.parse(pkg).version
  } catch {
    console.warn(
      'Skipping MediaPipe WASM sync: @mediapipe/tasks-genai is not installed.',
    )
    return
  }

  try {
    const files = (await readdir(wasmSrcDir)).filter(
      (file) => file.endsWith('.wasm') || file.endsWith('.js'),
    )

    // The copy is ~76 MB, so skip it when the mirror already matches.
    let stamp = null
    try {
      stamp = (await readFile(wasmStampPath, 'utf8')).trim()
    } catch {
      // No stamp yet — fall through and copy.
    }
    if (stamp === version) {
      const present = new Set(await readdir(wasmDestDir))
      if (files.every((file) => present.has(file))) return
    }

    await mkdir(wasmDestDir, { recursive: true })
    for (const file of files) {
      await copyFile(join(wasmSrcDir, file), join(wasmDestDir, file))
    }
    await writeFile(wasmStampPath, `${version}\n`)

    console.log(
      `Synced ${files.length} MediaPipe GenAI WASM files (v${version}).`,
    )
  } catch (error) {
    console.error('Error syncing MediaPipe WASM files:', error)
    process.exit(1)
  }
}

async function convertYamlToJson(yamlFilePath, jsonFilePath) {
  try {
    const yamlContent = await readFile(yamlFilePath, 'utf8')
    const parsedContent = parseYAML(yamlContent)
    await writeFile(jsonFilePath, JSON.stringify(parsedContent, null, 2) + '\n')
    // console.log(`Converted ${yamlFilePath} to ${jsonFilePath}`)
  } catch (error) {
    console.error(`Error converting ${yamlFilePath}:`, error)
    throw error
  }
}

async function generateAgentsManifest() {
  try {
    let files = await readdir(agentsDir)

    // First, convert any agent source YAML files to JSON
    const yamlFiles = files.filter((file) => file.endsWith('.agent.yaml'))
    for (const yamlFile of yamlFiles) {
      const yamlPath = join(agentsDir, yamlFile)
      const jsonFile = yamlFile.replace('.agent.yaml', '.agent.json')
      const jsonPath = join(agentsDir, jsonFile)
      await convertYamlToJson(yamlPath, jsonPath)
    }

    // Get updated file list after YAML conversion
    files = await readdir(agentsDir)
    const agents = files
      .filter((file) => file.endsWith('.json') && file !== 'manifest.json')
      .map((file) =>
        file.endsWith('.agent.json')
          ? file.replace('.agent.json', '')
          : file.replace('.json', ''),
      )
      .sort()

    const manifest = { agents }

    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

    console.log(`Generated manifest with ${agents.length} agents.`)
  } catch (error) {
    console.error('Error generating manifest:', error)
    process.exit(1)
  }
}

const methodologiesDir = join(__dirname, '../../public/methodologies')
const methodologiesManifestPath = join(methodologiesDir, 'manifest.json')

async function generateMethodologiesManifest() {
  try {
    let files = await readdir(methodologiesDir)

    // First, convert any agent source YAML files to JSON
    const yamlFiles = files.filter((file) => file.endsWith('.methodology.yaml'))
    for (const yamlFile of yamlFiles) {
      const yamlPath = join(methodologiesDir, yamlFile)
      const jsonFile = yamlFile.replace(
        '.methodology.yaml',
        '.methodology.json',
      )
      const jsonPath = join(methodologiesDir, jsonFile)
      await convertYamlToJson(yamlPath, jsonPath)
    }

    // Get updated file list after YAML conversion
    files = await readdir(methodologiesDir)
    const methodologies = files
      .filter((file) => file.endsWith('.json') && file !== 'manifest.json')
      .map((file) =>
        file.endsWith('.methodology.json')
          ? file.replace('.methodology.json', '')
          : file.replace('.json', ''),
      )
      .sort()

    const manifest = { methodologies }

    await writeFile(
      methodologiesManifestPath,
      JSON.stringify(manifest, null, 2) + '\n',
    )

    console.log(
      `Generated manifest with ${methodologies.length} methodologies.`,
    )
  } catch (error) {
    console.error('Error generating methodologies manifest:', error)
    process.exit(1)
  }
}

const extensionsDir = join(__dirname, '../../public/extensions')
const extensionsManifestPath = join(extensionsDir, 'manifest.json')

async function generateExtensionsManifest() {
  try {
    let files = await readdir(extensionsDir)

    // First, convert any extension source YAML files to JSON
    const yamlFiles = files.filter((file) => file.endsWith('.extension.yaml'))
    for (const yamlFile of yamlFiles) {
      const yamlPath = join(extensionsDir, yamlFile)
      const jsonFile = yamlFile.replace('.extension.yaml', '.extension.json')
      const jsonPath = join(extensionsDir, jsonFile)
      await convertYamlToJson(yamlPath, jsonPath)
    }

    // Get updated file list after YAML conversion
    files = await readdir(extensionsDir)
    const extensionFiles = files
      .filter((file) => file.endsWith('.json') && file !== 'manifest.json')
      .sort()

    // Read each extension file and include its metadata
    const extensions = await Promise.all(
      extensionFiles.map(async (file) => {
        const filePath = join(extensionsDir, file)
        const content = await readFile(filePath, 'utf8')
        const data = JSON.parse(content)
        delete data.pages
        delete data.configuration
        for (const key in data.i18n) {
          delete data.i18n[key].messages
        }
        return data
      }),
    )

    const manifest = {
      generatedAt: new Date().toISOString(),
      extensions,
    }

    await writeFile(
      extensionsManifestPath,
      JSON.stringify(manifest, null, 2) + '\n',
    )

    console.log(`Generated manifest with ${extensions.length} extensions.`)
  } catch (error) {
    console.error('Error generating extensions manifest:', error)
    process.exit(1)
  }
}

generateAgentsManifest()
generateMethodologiesManifest()
generateExtensionsManifest()
syncMediaPipeWasm()
