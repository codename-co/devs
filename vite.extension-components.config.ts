/**
 * Vite config for building standalone extension components
 *
 * Builds Section, Container, PromptArea and other shared components as ESM modules
 * that can be imported by marketplace extensions running in iframes.
 *
 * Usage: npx vite build --config vite.extension-components.config.ts
 */

import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  publicDir: false, // Don't copy public folder
  build: {
    outDir: 'public/extensions/components',
    emptyOutDir: true,
    lib: {
      entry: resolve(
        __dirname,
        'src/components/extension-components/index.tsx',
      ),
      name: 'DevsComponents',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      // Externalize deps that the iframe already provides via importmap
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        // '@heroui/react',
        'framer-motion',
      ],
      output: {
        // Provide global variables for externalized deps
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@heroui/react': 'HeroUI',
        },
      },
    },
    sourcemap: false,
    minify: false, // Keep readable for debugging
  },
})
