#!/usr/bin/env node
import { readdir, writeFile, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYAML } from 'yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const agentsDir = join(__dirname, '../../public/agents')
const manifestPath = join(agentsDir, 'manifest.json')

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

async function generateManifest() {
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
      .map((file) => {
        // Handle both .agent.json and .json naming conventions
        if (file.endsWith('.agent.json')) {
          return file.replace('.agent.json', '')
        }
        return file.replace('.json', '')
      })
      .sort()

    const manifest = { agents }

    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

    console.log(`Generated manifest with ${agents.length} agents.`)
  } catch (error) {
    console.error('Error generating manifest:', error)
    process.exit(1)
  }
}

generateManifest()
