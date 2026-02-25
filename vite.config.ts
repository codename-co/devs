import mdx from '@mdx-js/rollup'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
// import basicSsl from '@vitejs/plugin-basic-ssl'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { globSync } from 'glob'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { createMpaPlugin, type Page } from 'vite-plugin-virtual-mpa'

import { PRODUCT } from './src/config/product'
import {
  defaultLang,
  type Lang,
  langs,
  languages,
  meta,
} from './src/i18n/locales'
import { cacheVersionPlugin } from './src/lib/cache-version-plugin'
import { corsProxyPlugin } from './src/lib/cors-proxy-plugin'
import { oauthProxyPlugin } from './src/lib/oauth-proxy-plugin'
import { getProxyRoutes } from './vite-proxy-routes'

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))
const APP_VERSION = packageJson.version

// Dynamically list all pages with their full paths
const pageFiles = globSync('*/index.{tsx,mdx}', { cwd: './src/pages' })
const pagesList = pageFiles
  .map((file) => ({
    page: file.replace(/\/index\.(tsx|mdx)$/, ''),
    entry: `/src/pages/${file}` as `/${string}`,
  }))
  .map((e) => ({
    ...e,
    index: e.page === 'Index',
    notFound: e.page === 'NotFound',
  }))
  .map((e) => ({
    ...e,
    name: (lang: Lang) => `${lang}__${e.page.replace(/\//g, '__')}`,
    filename: (lang: Lang) =>
      `${
        e.notFound
          ? '404'
          : `${lang ? `${lang}/` : ''}${e.index ? '' : `${e.page.toLowerCase()}/`}index`
      }.html` as `${string}.html`,
    title: (lang: Lang) =>
      e.index
        ? PRODUCT.displayName
        : `${PRODUCT.displayName} · ${meta[lang || defaultLang]?.[e.page]?.title}`,
  }))

// Generate localized pages
const pages = langs.reduce((acc, lang = defaultLang) => {
  pagesList.forEach(({ page, name, entry, filename, title }) => {
    const isIndex = page === 'Index'
    const _title = title(lang)
    const _description =
      meta[lang || defaultLang]?.[page]?.description ?? PRODUCT.description
    console.log(
      `Adding page: [${lang}] /${isIndex ? '' : page.toLowerCase()}/`,
      {
        title: _title,
        description: _description,
      },
    )
    acc.push({
      name: name(lang),
      filename: filename(lang),
      entry,
      data: {
        lang,
        language: languages[lang],
        title: _title,
        description: _description,
      },
    })
  })
  return acc
}, [] as Page[])

/**
 * Vite plugin that watches YAML files in the public folder and runs
 * prepare-config-files.js when they change during development.
 */
function yamlWatchPlugin(): Plugin {
  return {
    name: 'yaml-watch',
    configureServer(server) {
      const runPrepareScript = (file: string) => {
        console.log(`\n[yaml-watch] Detected change in ${file}`)
        console.log('[yaml-watch] Running prepare-config-files.js...')
        try {
          execSync('node src/scripts/prepare-config-files.js', {
            cwd: process.cwd(),
            stdio: 'inherit',
          })
          console.log('[yaml-watch] Config files prepared successfully')
          // Trigger a full page reload after the config is updated
          server.ws.send({ type: 'full-reload' })
          console.log('[yaml-watch] Triggered browser reload\n')
        } catch (error) {
          console.error(
            '[yaml-watch] Failed to run prepare-config-files.js:',
            error,
          )
        }
      }

      server.watcher.add('public/**/*.yaml')
      server.watcher.on('change', (file) => {
        if (file.includes('public/') && file.endsWith('.yaml')) {
          runPrepareScript(file)
        }
      })
      server.watcher.on('add', (file) => {
        if (file.includes('public/') && file.endsWith('.yaml')) {
          runPrepareScript(file)
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      __APP_VERSION__: JSON.stringify(APP_VERSION),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    plugins: [
      react(),
      tailwindcss(),
      mdx(),
      yamlWatchPlugin(),
      // basicSsl(),
      createMpaPlugin({
        htmlMinify: true,
        pages,
      }) as any,
      cacheVersionPlugin(),
      corsProxyPlugin(),
      // Unified proxy plugin for all OAuth/API routes
      // Proxy configuration is defined in src/features/connectors/providers/apps/index.ts
      oauthProxyPlugin(getProxyRoutes(env)),
    ],
    optimizeDeps: {
      include: ['quickjs-emscripten'],
      exclude: ['@jitl/quickjs-wasmfile-release-sync'],
    },
    assetsInclude: ['**/*.wasm'],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@heroui/react'],
            i18n: ['@/i18n'],
            // ...Object.fromEntries(
            //   langs.map((lang) => [`i18n-${lang}`, [`@/i18n/locales/${lang}`]]),
            // ),
            icons: ['@/components/Icon'],
            editor: [
              '@/components/MonacoEditor',
              '@monaco-editor/react',
              'monaco-mermaid',
              'monaco-yaml',
            ],
            // features
            battle: ['@/features/battle'],
            // connectors removed - has cross-chunk circular dependencies with battle/sync
            live: ['@/features/live'],
            local: ['@/features/local-backup'],
            meeting: ['@/features/meeting-bot'],
            search: ['@/features/search'],
            studio: ['@/features/studio'],
            sync: ['@/features/sync'],
            traces: ['@/features/traces'],
          },
        },
      },
    },
    server: {
      port: 3000,
      host: true,
      // All proxy routes are handled by the oauthProxyPlugin above
    },
    preview: {
      port: 3000,
      host: true,
    },
  }
})
