#!/usr/bin/env node

/**
 * Prerender Script
 *
 * Uses Puppeteer to load pages in a real browser and capture the rendered HTML.
 * This works with React SPAs that use browser-specific APIs (IndexedDB, etc.)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const distDir = resolve(rootDir, 'dist')

// Configuration
const PORT = 3000 // Vite preview port (matches vite.config.ts)
const BASE_URL = `http://localhost:${PORT}`
const RENDER_TIMEOUT = 10_000 // 10 seconds max per page

// Languages to prerender
const LANGS = ['en', 'fr', 'es', 'de', 'ar', 'ko']
const DEFAULT_LANG = 'en'

// Routes to prerender (will be combined with languages)
const ROUTES = [
  '/',
  // '/methodologies/'
]

// Generate all URLs to prerender
function generateUrls() {
  const urls = []

  for (const route of ROUTES) {
    for (const lang of LANGS) {
      const langPrefix = lang === DEFAULT_LANG ? '' : `/${lang}`
      urls.push(`${langPrefix}${route}`)
    }
  }

  return urls
}

// Start the Vite preview server
async function startPreviewServer() {
  console.log('🚀 Starting preview server…')

  return new Promise((resolve, reject) => {
    const server = spawn('npm', ['run', 'preview'], {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    })

    let started = false

    server.stdout.on('data', (data) => {
      const output = data.toString()
      // Detect when Vite preview is ready
      if (
        (output.includes('Local:') || output.includes('localhost')) &&
        !started
      ) {
        started = true
        console.log('✓ Preview server starting…')
        // Give it more time to fully initialize and be ready to accept connections
        setTimeout(() => {
          console.log('✓ Preview server ready')
          resolve(server)
        }, 2000)
      }
    })

    server.stderr.on('data', (data) => {
      const output = data.toString()
      // Vite sometimes outputs to stderr for info messages
      if (
        (output.includes('Local:') || output.includes('localhost')) &&
        !started
      ) {
        started = true
        console.log('✓ Preview server starting…')
        setTimeout(() => {
          console.log('✓ Preview server ready')
          resolve(server)
        }, 2000)
      }
    })

    server.on('error', reject)

    // Timeout if server doesn't start
    setTimeout(() => {
      if (!started) {
        server.kill()
        reject(new Error('Preview server failed to start'))
      }
    }, RENDER_TIMEOUT)
  })
}

// Prerender a single URL
async function prerenderUrl(browser, url) {
  const page = await browser.newPage()

  try {
    const fullUrl = `${BASE_URL}${url}`
    console.log(`  Rendering: ${url}`)

    // Navigate to the page
    await page.goto(fullUrl, {
      waitUntil: 'networkidle2', // Less strict than networkidle0
      timeout: RENDER_TIMEOUT,
    })

    // Give React additional time to finish rendering async content
    await page.evaluate(() => new Promise((r) => setTimeout(r, 2000)))

    // Get the innerHTML of #root specifically (avoiding overlay containers and other injected elements)
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root')
      return root ? root.innerHTML : null
    })

    return rootContent
  } catch (error) {
    console.warn(`  ⚠ Failed to render ${url}: ${error.message}`)
    return null
  } finally {
    await page.close()
  }
}

// Determine the output file path for a URL
function getOutputPath(url) {
  // Clean the URL and determine path
  let path = url.replace(/\/$/, '') || ''
  if (!path) path = '/index'

  // Remove leading slash for path resolution
  const relativePath = path.startsWith('/') ? path.slice(1) : path

  // Check if the HTML file already exists
  const htmlPath = resolve(distDir, relativePath, 'index.html')
  if (existsSync(htmlPath)) {
    return htmlPath
  }

  // Fallback to root index for default language routes
  const rootHtml = resolve(distDir, 'index.html')
  if (existsSync(rootHtml) && !relativePath.includes('/')) {
    return rootHtml
  }

  return htmlPath
}

// Main prerender function
async function prerender() {
  console.log('\n📄 Prerender Script')
  console.log('========================\n')

  // Verify dist folder exists
  if (!existsSync(distDir)) {
    console.error('❌ Error: dist folder not found. Run "npm run build" first.')
    process.exit(1)
  }

  let server = null
  let browser = null

  try {
    // Start preview server
    server = await startPreviewServer()

    // Launch browser
    console.log('🌐 Launching browser…')
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    console.log('✓ Browser launched\n')

    // Generate URLs to prerender
    const urls = generateUrls()
    console.log(`📝 Prerendering ${urls.length} pages…\n`)

    let success = 0
    let failed = 0

    // Prerender each URL
    for (const url of urls) {
      const rootContent = await prerenderUrl(browser, url)

      if (rootContent) {
        const outputPath = getOutputPath(url)

        // Only write if the file exists (we're enhancing existing files)
        if (existsSync(outputPath)) {
          // Read the original file to preserve the structure
          const originalHtml = readFileSync(outputPath, 'utf-8')

          // Replace empty #root with prerendered content inside #root
          const newHtml = originalHtml.replace(
            /<div id="root"><\/div>/,
            `<div id="root">${rootContent}</div>`,
          )
          writeFileSync(outputPath, newHtml)
          console.log(`  ✓ Updated: ${outputPath.replace(distDir, 'dist')}`)
          success++
        } else {
          console.log(
            `  ⚠ File not found: ${outputPath.replace(distDir, 'dist')}`,
          )
          failed++
        }
      } else {
        failed++
      }
    }

    console.log(`\n✅ Prerendering complete!`)
    console.log(`   Success: ${success} pages`)
    console.log(`   Failed: ${failed} pages`)
  } catch (error) {
    console.error('\n❌ Prerendering failed:', error.message)
    process.exit(1)
  } finally {
    // Cleanup
    if (browser) {
      await browser.close()
      console.log('\n🔒 Browser closed')
    }
    if (server) {
      server.kill()
      console.log('🛑 Preview server stopped')
      process.exit(0)
    }
  }
}

// Run if called directly
prerender().catch(console.error)
