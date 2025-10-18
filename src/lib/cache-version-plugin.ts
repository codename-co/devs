import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

/**
 * Vite plugin that generates cache versioning for service worker
 * Injects build hash and cache manifest into the service worker
 */
export function cacheVersionPlugin(): Plugin {
  let buildHash: string

  return {
    name: 'devs-cache-version',

    // Generate build hash at the start of build
    buildStart() {
      buildHash = createHash('md5')
        .update(Date.now().toString())
        .digest('hex')
        .substring(0, 8)

      console.log(`[Cache Version Plugin] Generated build hash: ${buildHash}`)
    },

    // After build, collect all output files and generate manifest
    closeBundle() {
      const outputDir = resolve(process.cwd(), 'dist')

      console.log('[Cache Version Plugin] Generating cache manifest...')

      // Read the service worker file
      const swPath = resolve(outputDir, 'sw.js')
      let swContent: string

      try {
        swContent = readFileSync(swPath, 'utf-8')
      } catch (error) {
        console.warn(
          '[Cache Version Plugin] Service worker not found at:',
          swPath,
        )
        return
      }

      // Replace cache version placeholders
      swContent = swContent.replace(
        /const CACHE_VERSION = '.*?'/,
        `const CACHE_VERSION = '${buildHash}'`,
      )

      swContent = swContent.replace(
        /const CACHE_NAME = 'devs-new-v1'/,
        `const CACHE_NAME = 'devs-new-v${buildHash}'`,
      )

      swContent = swContent.replace(
        /const API_CACHE_NAME = 'devs-new-cache-v1'/,
        `const API_CACHE_NAME = 'devs-new-cache-v${buildHash}'`,
      )

      // Write the updated service worker
      writeFileSync(swPath, swContent, 'utf-8')

      // Generate cache manifest with build info
      const manifest = {
        version: buildHash,
        buildTime: new Date().toISOString(),
        cacheNames: {
          static: `devs-new-v${buildHash}`,
          api: `devs-new-cache-v${buildHash}`,
          transformers: 'transformers-cache',
        },
      }

      // Write cache manifest
      const manifestPath = resolve(outputDir, 'cache-manifest.json')
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

      console.log(
        '[Cache Version Plugin] Cache manifest generated:',
        manifestPath,
      )
      console.log(
        '[Cache Version Plugin] Service worker updated with version:',
        buildHash,
      )
    },
  }
}
