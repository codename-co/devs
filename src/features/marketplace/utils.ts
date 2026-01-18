import globals from '@/styles/globals.css?raw'

/**
 * Marketplace Utilities
 */

import type { ExtensionColor } from './types'

/**
 * Map extension color to Tailwind text color class
 */
export function getExtensionColorClass(color?: ExtensionColor): string {
  const colorMap: Record<ExtensionColor, string> = {
    default: 'text-default-500',
    primary: 'text-primary-500',
    secondary: 'text-secondary-500',
    success: 'text-success-500',
    warning: 'text-warning-500',
    danger: 'text-danger-500',
    info: 'text-cyan-500',
    red: 'text-red-500',
    orange: 'text-orange-500',
    yellow: 'text-yellow-500',
    green: 'text-green-500',
    teal: 'text-teal-500',
    blue: 'text-blue-500',
    indigo: 'text-indigo-500',
    purple: 'text-purple-500',
    pink: 'text-pink-500',
    gray: 'text-gray-500',
  }
  return color ? colorMap[color] || 'text-emerald-500' : 'text-emerald-500'
}

/**
 * Context object passed to extension apps
 */
export interface DevsContext {
  extensionId?: string
  extensionName?: string
  theme: 'dark' | 'light'
  language: string
  /** i18n messages for the current locale */
  i18n?: Record<string, string>
}

/**
 * HeroUI-compatible theme configuration for Tailwind Browser CDN
 * Replicates the theme colors from tailwind.config.js
 * Supports both light and dark modes via CSS variables
 *
 * HeroUI components use Tailwind utility classes like bg-content1, bg-default-100, etc.
 * We need to define these as proper Tailwind theme colors in the @theme block.
 * For dark mode, we use CSS variables that get swapped based on .dark class.
 */
const heroUIThemeCSS = /* css */ `
  /* Light theme CSS variables */
  :root {
    --theme-background: #FFFFFF;
    --theme-foreground: #11181C;
    --theme-divider: rgba(17, 17, 17, 0.15);
    --theme-focus: #006FEE;
    --theme-overlay: #000000;
    --theme-content1: #FFFFFF;
    --theme-content1-foreground: #11181C;
    --theme-content2: #f4f4f5;
    --theme-content2-foreground: #27272a;
    --theme-content3: #e4e4e7;
    --theme-content3-foreground: #3f3f46;
    --theme-content4: #d4d4d8;
    --theme-content4-foreground: #52525b;
    --theme-default: #d4d4d8;
    --theme-default-foreground: #11181C;
    --theme-default-50: #fafafa;
    --theme-default-100: #f4f4f5;
    --theme-default-200: #e4e4e7;
    --theme-default-300: #d4d4d8;
    --theme-default-400: #a1a1aa;
    --theme-default-500: #71717a;
    --theme-default-600: #52525b;
    --theme-default-700: #3f3f46;
    --theme-default-800: #27272a;
    --theme-default-900: #18181b;
    --theme-primary: #006FEE;
    --theme-primary-foreground: #FFFFFF;
    --theme-primary-50: #e6f1fe;
    --theme-primary-100: #cce3fd;
    --theme-primary-200: #99c7fb;
    --theme-primary-300: #66aaf9;
    --theme-primary-400: #338ef7;
    --theme-primary-500: #006FEE;
    --theme-primary-600: #005bc4;
    --theme-primary-700: #004493;
    --theme-primary-800: #002e62;
    --theme-primary-900: #001731;
    --theme-secondary: #9353d3;
    --theme-secondary-foreground: #FFFFFF;
    --theme-success: #17c964;
    --theme-success-foreground: #FFFFFF;
    --theme-warning: #f5a524;
    --theme-warning-foreground: #FFFFFF;
    --theme-danger: #f31260;
    --theme-danger-foreground: #FFFFFF;
  }

  /* Dark theme CSS variables */
  .dark {
    --theme-background: #000000;
    --theme-foreground: #ECEDEE;
    --theme-divider: rgba(255, 255, 255, 0.15);
    --theme-focus: #006FEE;
    --theme-overlay: #000000;
    --theme-content1: #18181b;
    --theme-content1-foreground: #fafafa;
    --theme-content2: #27272a;
    --theme-content2-foreground: #f4f4f5;
    --theme-content3: #3f3f46;
    --theme-content3-foreground: #e4e4e7;
    --theme-content4: #52525b;
    --theme-content4-foreground: #d4d4d8;
    --theme-default: #3f3f46;
    --theme-default-foreground: #ECEDEE;
    --theme-default-50: #18181b;
    --theme-default-100: #27272a;
    --theme-default-200: #3f3f46;
    --theme-default-300: #52525b;
    --theme-default-400: #71717a;
    --theme-default-500: #a1a1aa;
    --theme-default-600: #d4d4d8;
    --theme-default-700: #e4e4e7;
    --theme-default-800: #f4f4f5;
    --theme-default-900: #fafafa;
    --theme-primary: #006FEE;
    --theme-primary-foreground: #FFFFFF;
    --theme-primary-50: #001731;
    --theme-primary-100: #002e62;
    --theme-primary-200: #004493;
    --theme-primary-300: #005bc4;
    --theme-primary-400: #006FEE;
    --theme-primary-500: #338ef7;
    --theme-primary-600: #66aaf9;
    --theme-primary-700: #99c7fb;
    --theme-primary-800: #cce3fd;
    --theme-primary-900: #e6f1fe;
    --theme-secondary: #a78bfa;
    --theme-secondary-foreground: #FFFFFF;
    --theme-success: #17c964;
    --theme-success-foreground: #FFFFFF;
    --theme-warning: #f5a524;
    --theme-warning-foreground: #FFFFFF;
    --theme-danger: #f31260;
    --theme-danger-foreground: #FFFFFF;
  }

  @theme inline {
    /* HeroUI semantic colors - reference CSS variables for dark mode support */
    --color-background: var(--theme-background);
    --color-foreground: var(--theme-foreground);
    --color-divider: var(--theme-divider);
    --color-focus: var(--theme-focus);
    --color-overlay: var(--theme-overlay);

    /* Content colors */
    --color-content1: var(--theme-content1);
    --color-content1-foreground: var(--theme-content1-foreground);
    --color-content2: var(--theme-content2);
    --color-content2-foreground: var(--theme-content2-foreground);
    --color-content3: var(--theme-content3);
    --color-content3-foreground: var(--theme-content3-foreground);
    --color-content4: var(--theme-content4);
    --color-content4-foreground: var(--theme-content4-foreground);

    /* Default (neutral) colors */
    --color-default: var(--theme-default);
    --color-default-foreground: var(--theme-default-foreground);
    --color-default-50: var(--theme-default-50);
    --color-default-100: var(--theme-default-100);
    --color-default-200: var(--theme-default-200);
    --color-default-300: var(--theme-default-300);
    --color-default-400: var(--theme-default-400);
    --color-default-500: var(--theme-default-500);
    --color-default-600: var(--theme-default-600);
    --color-default-700: var(--theme-default-700);
    --color-default-800: var(--theme-default-800);
    --color-default-900: var(--theme-default-900);

    /* Primary colors */
    --color-primary: var(--theme-primary);
    --color-primary-foreground: var(--theme-primary-foreground);
    --color-primary-50: var(--theme-primary-50);
    --color-primary-100: var(--theme-primary-100);
    --color-primary-200: var(--theme-primary-200);
    --color-primary-300: var(--theme-primary-300);
    --color-primary-400: var(--theme-primary-400);
    --color-primary-500: var(--theme-primary-500);
    --color-primary-600: var(--theme-primary-600);
    --color-primary-700: var(--theme-primary-700);
    --color-primary-800: var(--theme-primary-800);
    --color-primary-900: var(--theme-primary-900);

    /* Secondary colors */
    --color-secondary: var(--theme-secondary);
    --color-secondary-foreground: var(--theme-secondary-foreground);

    /* Status colors */
    --color-success: var(--theme-success);
    --color-success-foreground: var(--theme-success-foreground);
    --color-warning: var(--theme-warning);
    --color-warning-foreground: var(--theme-warning-foreground);
    --color-danger: var(--theme-danger);
    --color-danger-foreground: var(--theme-danger-foreground);

    /* Box shadow */
    --shadow-small: 0px 0px 5px 0px rgb(0 0 0 / 0.02), 0px 2px 10px 0px rgb(0 0 0 / 0.06), 0px 0px 1px 0px rgb(0 0 0 / 0.3);
    --shadow-medium: 0px 0px 15px 0px rgb(0 0 0 / 0.03), 0px 2px 30px 0px rgb(0 0 0 / 0.08), 0px 0px 1px 0px rgb(0 0 0 / 0.3);
    --shadow-large: 0px 0px 30px 0px rgb(0 0 0 / 0.04), 0px 30px 60px 0px rgb(0 0 0 / 0.12), 0px 0px 1px 0px rgb(0 0 0 / 0.3);

    /* Border radius */
    --radius-small: 8px;
    --radius-medium: 12px;
    --radius-large: 14px;
  }

  /* HeroUI custom rounded utilities */
  .rounded-small { border-radius: 8px; }
  .rounded-medium { border-radius: 12px; }
  .rounded-large { border-radius: 14px; }
  .rounded-t-small { border-top-left-radius: 8px; border-top-right-radius: 8px; }
  .rounded-t-medium { border-top-left-radius: 12px; border-top-right-radius: 12px; }
  .rounded-t-large { border-top-left-radius: 14px; border-top-right-radius: 14px; }
  .rounded-b-small { border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; }
  .rounded-b-medium { border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; }
  .rounded-b-large { border-bottom-left-radius: 14px; border-bottom-right-radius: 14px; }
`

/**
 * Generate HTML template for rendering a marketplace app page
 * Uses Preact + Babel + TailwindCSS for client-side rendering
 * Injects a DEVS context object for the extension to access
 */
export function generateAppPageHtml(
  pageCode: string,
  isDarkTheme: boolean = true,
  context?: DevsContext,
): string {
  return /* html */ `<!doctype html>
<html lang="en" class="${isDarkTheme ? 'dark' : ''}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <script src="https://cdn.jsdelivr.net/npm/@babel/standalone/babel.min.js"></script>
  <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/preact@10/compat",
        "react-dom": "https://esm.sh/preact@10/compat",
        "react-dom/client": "https://esm.sh/preact@10/compat/client?standalone",
        "react/jsx-runtime": "https://esm.sh/preact@10/jsx-runtime",
        "framer-motion": "https://esm.sh/framer-motion?standalone&external=react,react-dom",
        "@heroui/react": "https://esm.sh/@heroui/react?standalone&external=react,react-dom",
        "@devs/components": "/extensions/components/index.js"
      }
    }
  </script>
  <script>
    // Set context data for the DEVS bridge
    window.__DEVS_CONTEXT__ = ${JSON.stringify(context || {})};
  </script>
  <script src="/extensions/extension-bridge.js"></script>
  <style type="text/tailwindcss">
    ${heroUIThemeCSS}
  </style>
  <style>
    ${globals}
  </style>
</head>
<body class="bg-background dark:bg-content1 text-foreground rtl:*">
  <div id="root"></div>
  <script type="text/babel" data-type="module">
    import React, { render } from 'react-dom'
    import { HeroUIProvider } from '@heroui/react'

    ${pageCode}

    render(
      <HeroUIProvider>
        <App />
      </HeroUIProvider>,
      document.getElementById('root')
    )
  </script>
</body>
</html>`
}
