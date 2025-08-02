import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { createMpaPlugin, type Page } from 'vite-plugin-virtual-mpa'

import { PRODUCT } from './src/config/product'
import { defaultLang, langs, useTranslations } from './src/i18n'

// Dynamically list all pages
const pagesList = readdirSync(resolve(__dirname, './src/pages'))
  .filter((file) => file.endsWith('.tsx'))
  .map((file) => file.replace('Page.tsx', '').toLowerCase())

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

// Generate localized pages
const pages = langs.reduce((acc, lang) => {
  const t = useTranslations(lang)

  pagesList.forEach((page) => {
    const isMainPage = page === 'home' || page === 'index'
    const pageName = isMainPage ? 'index' : page
    acc.push({
      name: `${lang}__${pageName}`,
      filename: isMainPage
        ? `${lang ? `${lang}/` : ''}index.html`
        : `${lang ? `${lang}/` : ''}${pageName}/index.html`,
      entry: `/src/pages/${capitalize(page)}Page.tsx`,
      data: {
        lang: lang ?? defaultLang,
        title: isMainPage
          ? PRODUCT.displayName
          : `${PRODUCT.displayName} · ${page}`,
        description: t(
          `Delegate to adaptive AI teams that form, collaborate, and deliver automatically. Browser-native AI orchestration platform.`,
        ),
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
