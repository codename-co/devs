import mdx from '@mdx-js/rollup'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { globSync } from 'glob'
import { defineConfig } from 'vite'
import { createMpaPlugin, type Page } from 'vite-plugin-virtual-mpa'

import { PRODUCT } from './src/config/product'
import { defaultLang, type Lang, langs, meta } from './src/i18n'

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
        : `${PRODUCT.displayName} · ${meta[lang]?.[e.page]?.title}`,
  }))

// Generate localized pages
const pages = langs.reduce((acc, lang = defaultLang) => {
  pagesList.forEach(({ page, name, entry, filename, title }) => {
    const isIndex = page === 'Index'
    acc.push({
      name: name(lang),
      filename: filename(lang),
      entry,
      data: {
        lang,
        title: title(lang),
        description: meta[lang]?.[page]?.description,
      },
    })
  })
  return acc
}, [] as Page[])

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mdx(),
    createMpaPlugin({
      htmlMinify: true,
      pages,
    }),
  ],
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
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: 3000,
    host: true,
  },
})
