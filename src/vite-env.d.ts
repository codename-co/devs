/// <reference types="vite/client" />

// Declare module for importing CSS files as raw strings
declare module '*.css?raw' {
  const content: string
  export default content
}
