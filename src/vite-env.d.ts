/// <reference types="vite/client" />

// Build-time constants injected by Vite
declare const __APP_VERSION__: string
declare const __BUILD_TIME__: string

// Declare module for importing CSS files as raw strings
declare module '*.css?raw' {
  const content: string
  export default content
}
