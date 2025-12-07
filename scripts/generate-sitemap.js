#!/usr/bin/env node

/**
 * Sitemap Generator for DEVS
 * Generates sitemap.xml during build process
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { globSync } from 'glob'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

// Configuration
const SITE_URL = 'https://devs.new'
const LANGS = ['en', 'fr', 'es', 'de', 'ar', 'ko'] // TODO: sync with i18n config
const DEFAULT_LANG = 'en'

// Priority mapping for different page types
const PRIORITY_MAP = {
  Index: '1.0',
  Agents: '0.9',
  Knowledge: '0.7',
  Methodologies: '0.7',
  Tasks: '0.6',
  Conversation: '0.5',
  AgentMemory: '0.5',
  Settings: '0.5',
  Demo: '0.0',
  Voice: '0.0',
}

// Change frequency mapping
const CHANGEFREQ_MAP = {
  Index: 'daily',
  Agents: 'weekly',
  Settings: 'monthly',
  Knowledge: 'weekly',
  Methodologies: 'monthly',
  Tasks: 'weekly',
  default: 'weekly',
}

function generateSitemap() {
  // Find all page directories
  const pageFiles = globSync('*/index.{tsx,mdx}', {
    cwd: resolve(rootDir, 'src/pages'),
  })

  const pages = pageFiles
    .map((file) => file.replace(/\/index\.(tsx|mdx)$/, ''))
    .filter((page) => page !== 'NotFound') // Exclude 404 page

  const today = new Date().toISOString().split('T')[0]

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`

  // Generate URLs for each page in each language
  for (const page of pages) {
    const isIndex = page === 'Index'
    const pagePath = isIndex ? '' : `${page.toLowerCase()}/`
    const priority = PRIORITY_MAP[page] || '0.5'
    const changefreq = CHANGEFREQ_MAP[page] || CHANGEFREQ_MAP.default

    for (const lang of LANGS) {
      const langPrefix = lang === DEFAULT_LANG ? '' : `${lang}/`
      const url = `${SITE_URL}/${langPrefix}${pagePath}`

      sitemap += /* xml */ `  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
`

      // Add hreflang alternates for all languages
      for (const altLang of LANGS) {
        const altLangPrefix = altLang === DEFAULT_LANG ? '' : `${altLang}/`
        const altUrl = `${SITE_URL}/${altLangPrefix}${pagePath}`
        sitemap += `    <xhtml:link rel="alternate" hreflang="${altLang}" href="${altUrl}"/>\n`
      }

      // Add x-default pointing to default language
      const defaultUrl = `${SITE_URL}/${pagePath}`
      sitemap += `    <xhtml:link rel="alternate" hreflang="x-default" href="${defaultUrl}"/>\n`

      sitemap += `  </url>\n`
    }
  }

  sitemap += `</urlset>\n`

  // Write to dist folder (for production) or public folder (for dev)
  const distDir = resolve(rootDir, 'dist')
  const publicDir = resolve(rootDir, 'public')

  // Always write to public for development
  writeFileSync(resolve(publicDir, 'sitemap.xml'), sitemap)
  console.log('✓ Generated sitemap.xml in public/')

  // Also write to dist if it exists (post-build)
  if (existsSync(distDir)) {
    writeFileSync(resolve(distDir, 'sitemap.xml'), sitemap)
    console.log('✓ Generated sitemap.xml in dist/')
  }

  console.log(
    `  → ${pages.length} pages × ${LANGS.length} languages = ${pages.length * LANGS.length} URLs`,
  )
}

generateSitemap()
