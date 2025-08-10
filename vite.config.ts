import mdx from '@mdx-js/rollup'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { createMpaPlugin, type Page } from 'vite-plugin-virtual-mpa'

import { PRODUCT } from './src/config/product'
import { defaultLang, langs, meta } from './src/i18n'

// Dynamically list all pages
const pagesList = readdirSync(resolve(__dirname, './src/pages'))
  .filter((file) => file.endsWith('.tsx'))
  .map((file) => file.replace('.page.tsx', ''))

// Generate localized pages
const pages = langs.reduce((acc, lang) => {
  pagesList.forEach((page) => {
    const isIndex = page === 'Index'
    const is404 = page === 'NotFound'
    acc.push({
      name: `${lang}__${page}`,
      filename: isIndex
        ? `${lang ? `${lang}/` : ''}index.html`
        : is404
          ? `404.html`
          : `${lang ? `${lang}/` : ''}${page.toLowerCase()}/index.html`,
      entry: `/src/pages/${page}.page.tsx`,
      data: {
        lang: lang ?? defaultLang,
        title: isIndex
          ? PRODUCT.displayName
          : `${PRODUCT.displayName} · ${meta[lang]?.[page]?.title}`,
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
