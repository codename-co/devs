#!/usr/bin/env node
import { readdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const agentsDir = join(__dirname, '../public/agents')
const manifestPath = join(agentsDir, 'manifest.json')

async function generateManifest() {
  try {
    const files = await readdir(agentsDir)
    const agents = files
      .filter((file) => file.endsWith('.json') && file !== 'manifest.json')
      .map((file) => file.replace('.json', ''))
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
