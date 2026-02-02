import globals from '@/styles/globals.css?raw'

/**
 * Marketplace Utilities
 */

import type { ExtensionColor } from './types'

// =============================================================================
// VERSION COMPARISON
// =============================================================================

/**
 * Compare two semantic version strings.
 * Returns:
 *   -1 if version1 < version2
 *    0 if version1 === version2
 *    1 if version1 > version2
 *
 * Handles versions like "1.0.0", "1.0", "1", "1.0.0-beta.1"
 * Pre-release versions are considered lower than release versions.
 */
export function compareVersions(
  version1: string,
  version2: string,
): -1 | 0 | 1 {
  // Handle edge cases
  if (!version1 && !version2) return 0
  if (!version1) return -1
  if (!version2) return 1
  if (version1 === version2) return 0

  // Split version and pre-release parts
  const [v1Base, v1Pre] = version1.split('-')
  const [v2Base, v2Pre] = version2.split('-')

  // Parse version parts as numbers
  const v1Parts = v1Base.split('.').map((p) => parseInt(p, 10) || 0)
  const v2Parts = v2Base.split('.').map((p) => parseInt(p, 10) || 0)

  // Normalize length by padding with zeros
  const maxLength = Math.max(v1Parts.length, v2Parts.length)
  while (v1Parts.length < maxLength) v1Parts.push(0)
  while (v2Parts.length < maxLength) v2Parts.push(0)

  // Compare each part
  for (let i = 0; i < maxLength; i++) {
    if (v1Parts[i] > v2Parts[i]) return 1
    if (v1Parts[i] < v2Parts[i]) return -1
  }

  // If base versions are equal, compare pre-release
  // A version without pre-release is greater than one with pre-release
  if (!v1Pre && v2Pre) return 1
  if (v1Pre && !v2Pre) return -1
  if (v1Pre && v2Pre) {
    // Simple lexicographic comparison for pre-release
    if (v1Pre > v2Pre) return 1
    if (v1Pre < v2Pre) return -1
  }

  return 0
}

/**
 * Check if version2 is newer than version1
 */
export function isNewerVersion(version1: string, version2: string): boolean {
  return compareVersions(version1, version2) === -1
}

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

  /* Fix for HeroUI Select/Input floating labels when value is selected */
  /* When the component has a value (is-filled) or is focused, shrink and move the label up */
  [data-slot="label"][data-filled="true"],
  [data-slot="label"][data-focus="true"],
  [data-filled="true"] [data-slot="label"],
  [data-focus="true"] [data-slot="label"] {
    transform: translateY(-50%) scale(0.85);
    padding: 0 4px;
    margin-left: -4px;
  }
`

/**
 * Console interception script that forwards console messages to parent window
 */
const consoleInterceptScript = /* js */ `
  // Intercept console methods and forward to parent
  (function() {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };

    function formatValue(arg, depth = 0) {
      if (depth > 5) return '[Max depth reached]';

      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';

      // Handle Error objects - check prototype chain and duck typing
      if (arg instanceof Error || (arg && typeof arg === 'object' && 'message' in arg && ('stack' in arg || 'name' in arg))) {
        let errorStr = '';

        // Get error name and message
        const name = arg.name || arg.constructor?.name || 'Error';
        const message = arg.message || '';
        errorStr = name + (message ? ': ' + message : '');

        // Add location info (Babel-style errors)
        if (arg.loc) {
          errorStr += ' at line ' + arg.loc.line + ', column ' + arg.loc.column;
        }

        // Add code frame (Babel provides this for syntax errors)
        if (arg.codeFrame) {
          errorStr += '\\n\\n' + arg.codeFrame;
        }

        // Add stack trace if available
        if (arg.stack) {
          // Check if stack already includes the message
          if (!arg.stack.includes(message)) {
            errorStr += '\\n' + arg.stack;
          } else {
            errorStr = arg.stack;
          }
        }

        // Include any other useful properties
        const skipKeys = new Set(['name', 'message', 'stack', 'loc', 'codeFrame', 'pos', 'missingPlugin']);
        for (const key of Object.getOwnPropertyNames(arg)) {
          if (!skipKeys.has(key)) {
            try {
              const val = arg[key];
              if (val !== undefined && val !== null && typeof val !== 'function') {
                errorStr += '\\n' + key + ': ' + formatValue(val, depth + 1);
              }
            } catch (e) {}
          }
        }

        return errorStr;
      }

      if (typeof arg === 'object') {
        try {
          // Check for error-like objects from Babel parser
          if (arg.message && (arg.loc || arg.pos !== undefined)) {
            let errStr = arg.message;
            if (arg.loc) {
              errStr += ' at line ' + arg.loc.line + ', column ' + arg.loc.column;
            }
            if (arg.codeFrame) {
              errStr += '\\n\\n' + arg.codeFrame;
            }
            return errStr;
          }

          // For arrays, format each element
          if (Array.isArray(arg)) {
            return '[' + arg.map(item => formatValue(item, depth + 1)).join(', ') + ']';
          }

          return JSON.stringify(arg, (key, value) => {
            if (value instanceof Error) {
              return { name: value.name, message: value.message, stack: value.stack };
            }
            if (typeof value === 'function') return '[Function]';
            return value;
          }, 2);
        } catch (e) {
          return Object.prototype.toString.call(arg);
        }
      }
      return String(arg);
    }

    function sendToParent(level, args) {
      try {
        // Filter out empty strings and combine meaningfully
        const parts = args.map(arg => formatValue(arg)).filter(s => s && s.trim());
        const message = parts.join(' ');

        // Skip empty messages
        if (!message.trim()) return;

        window.parent.postMessage({
          type: 'DEVS_CONSOLE_MESSAGE',
          payload: { level, message }
        }, '*');
      } catch (e) {
        // Silently fail if postMessage fails
      }
    }

    console.log = function(...args) {
      sendToParent('log', args);
      originalConsole.log.apply(console, args);
    };

    console.info = function(...args) {
      sendToParent('info', args);
      originalConsole.info.apply(console, args);
    };

    console.warn = function(...args) {
      // Filter out expected Babel in-browser warning (we're intentionally using browser transform for live preview)
      const firstArg = args[0];
      if (typeof firstArg === 'string' && firstArg.includes('in-browser Babel transformer')) {
        originalConsole.warn.apply(console, args);
        return;
      }
      sendToParent('warn', args);
      originalConsole.warn.apply(console, args);
    };

    console.error = function(...args) {
      sendToParent('error', args);
      originalConsole.error.apply(console, args);
    };

    // Capture uncaught errors with full details
    window.addEventListener('error', function(event) {
      let errorMessage = '';

      if (event.error) {
        errorMessage = formatValue(event.error);
      } else if (event.message && event.message !== 'Script error.') {
        // Only use event.message if it's meaningful
        errorMessage = event.message;
        if (event.filename) {
          errorMessage += '\\n  at ' + event.filename;
          if (event.lineno) {
            errorMessage += ':' + event.lineno;
            if (event.colno) {
              errorMessage += ':' + event.colno;
            }
          }
        }
      }

      // Only send if we have meaningful error info
      if (errorMessage && errorMessage.trim() && errorMessage !== 'Script error.') {
        sendToParent('error', ['Uncaught: ' + errorMessage]);
      }
    }, true);

    // Capture unhandled promise rejections with full details
    window.addEventListener('unhandledrejection', function(event) {
      const reason = event.reason;
      const message = formatValue(reason);
      if (message && message.trim()) {
        sendToParent('error', ['Unhandled Promise Rejection: ' + message]);
      }
    }, true);
  })();
`

/**
 * Babel patch script to capture transformation errors with full details
 */
const babelPatchScript = /* js */ `
  // Patch Babel to capture transformation errors with full details
  (function() {
    if (typeof Babel !== 'undefined') {
      const originalTransform = Babel.transform;
      Babel.transform = function(code, options) {
        try {
          return originalTransform.call(this, code, options);
        } catch (e) {
          // Log the full Babel error with code frame
          console.error('Babel Syntax Error:', e);
          throw e;
        }
      };
    }
  })();
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
  captureConsole: boolean = false,
): string {
  const consoleScript = captureConsole
    ? `<script>${consoleInterceptScript}</script>`
    : ''
  const babelPatch = captureConsole
    ? `<script>${babelPatchScript}</script>`
    : ''

  return /* html */ `<!doctype html>
<html lang="en" class="${isDarkTheme ? 'dark' : ''}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${consoleScript}
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.28.6/babel.min.js"></script>
  ${babelPatch}
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
  <script type="text/babel" data-type="module" data-presets="react" data-targets="defaults">
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

/**
 * Generate HTML template for rendering a marketplace app page with console capture.
 * Wrapper around generateAppPageHtml with console interception enabled.
 */
export function generateAppPageHtmlWithConsole(
  pageCode: string,
  isDarkTheme: boolean = true,
  context?: DevsContext,
): string {
  return generateAppPageHtml(pageCode, isDarkTheme, context, true)
}
