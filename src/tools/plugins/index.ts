/**
 * Tool Plugins
 *
 * This module exports all available tool plugins.
 * Each plugin is a self-contained tool that can be registered
 * with the tool registry.
 *
 * @module tools/plugins
 *
 * @example
 * ```typescript
 * import { toolRegistry } from '@/tools'
 * import { calculatePlugin, allPlugins } from '@/tools/plugins'
 *
 * // Register a single plugin
 * toolRegistry.register(calculatePlugin)
 *
 * // Or register all plugins
 * allPlugins.forEach(plugin => toolRegistry.register(plugin))
 * ```
 */

// Math tools
export { calculatePlugin } from './calculate'

// Code tools
export { executePlugin } from './execute'

// Presentation tools
export { generatePresentationPlugin } from './generate-presentation'

// Knowledge tools
export {
  searchKnowledgePlugin,
  readDocumentPlugin,
  listDocumentsPlugin,
  getDocumentSummaryPlugin,
  knowledgePlugins,
} from './knowledge'

// Wikipedia tools
export {
  wikipediaSearchPlugin,
  wikipediaArticlePlugin,
  wikipediaPlugins,
  WIKIPEDIA_SEARCH_TOOL_DEFINITION,
  WIKIPEDIA_ARTICLE_TOOL_DEFINITION,
} from './wikipedia'
export type {
  WikipediaSearchParams,
  WikipediaArticleParams,
  WikipediaSearchResult,
  WikipediaSearchResponse,
  WikipediaArticleResponse,
  WikipediaError,
} from './wikipedia'

// Wikidata tools
export {
  wikidataSearchPlugin,
  wikidataEntityPlugin,
  wikidataSparqlPlugin,
  wikidataPlugins,
  WIKIDATA_SEARCH_TOOL_DEFINITION,
  WIKIDATA_ENTITY_TOOL_DEFINITION,
  WIKIDATA_SPARQL_TOOL_DEFINITION,
} from './wikidata'
export type {
  WikidataSearchParams,
  WikidataEntityParams,
  WikidataSparqlParams,
  WikidataSearchResult,
  WikidataProperty,
  WikidataSearchResponse,
  WikidataEntityResponse,
  WikidataSparqlResponse,
  WikidataError,
} from './wikidata'

// arXiv tools
export {
  arxivSearchPlugin,
  arxivPaperPlugin,
  arxivPlugins,
  ARXIV_SEARCH_TOOL_DEFINITION,
  ARXIV_PAPER_TOOL_DEFINITION,
} from './arxiv'
export type {
  ArxivSearchParams,
  ArxivPaperParams,
  ArxivAuthor,
  ArxivPaper,
  ArxivSearchResponse,
  ArxivPaperResponse,
  ArxivError,
} from './arxiv'

// Text OCR tools
export { textOcrPlugin, TEXT_OCR_TOOL_DEFINITION } from './text-ocr'
export type { TextOcrParams, TextOcrResult, TextOcrError } from './text-ocr'

// Skill tools
export {
  activateSkillPlugin,
  readSkillFilePlugin,
  runSkillScriptPlugin,
  skillPlugins,
  SKILL_TOOL_DEFINITIONS,
} from './skill-tools'

// Connector tools - re-export all from connectors
export * from './connectors'

// Import all plugins for bulk registration
import { calculatePlugin } from './calculate'
import { executePlugin } from './execute'
import { generatePresentationPlugin } from './generate-presentation'
import {
  searchKnowledgePlugin,
  readDocumentPlugin,
  listDocumentsPlugin,
  getDocumentSummaryPlugin,
} from './knowledge'
import { wikipediaSearchPlugin, wikipediaArticlePlugin } from './wikipedia'
import {
  wikidataSearchPlugin,
  wikidataEntityPlugin,
  wikidataSparqlPlugin,
} from './wikidata'
import { arxivSearchPlugin, arxivPaperPlugin } from './arxiv'
import { textOcrPlugin } from './text-ocr'
import { activateSkillPlugin, readSkillFilePlugin, runSkillScriptPlugin } from './skill-tools'
import { allConnectorPlugins } from './connectors'
import type { ToolPlugin } from '../types'

/**
 * Array of all available tool plugins (excluding connectors).
 * Use this to register core plugins at once.
 */
export const corePlugins: ToolPlugin<any, any>[] = [
  // Math
  calculatePlugin,
  // Code
  executePlugin,
  // Presentation
  generatePresentationPlugin,
  // Knowledge
  searchKnowledgePlugin,
  readDocumentPlugin,
  listDocumentsPlugin,
  getDocumentSummaryPlugin,
  // Research
  wikipediaSearchPlugin,
  wikipediaArticlePlugin,
  wikidataSearchPlugin,
  wikidataEntityPlugin,
  wikidataSparqlPlugin,
  arxivSearchPlugin,
  arxivPaperPlugin,
  // Utility
  textOcrPlugin,
  // Agent Skills
  activateSkillPlugin,
  readSkillFilePlugin,
  runSkillScriptPlugin,
]

/**
 * Array of all available tool plugins (including connectors).
 * Use this to register all plugins at once.
 */
export const allPlugins: ToolPlugin<any, any>[] = [
  ...corePlugins,
  // Connectors
  ...allConnectorPlugins,
]

/**
 * Grouped plugins by category for convenience.
 */
export const pluginsByCategory = {
  math: [calculatePlugin],
  code: [executePlugin],
  presentation: [generatePresentationPlugin],
  knowledge: [
    searchKnowledgePlugin,
    readDocumentPlugin,
    listDocumentsPlugin,
    getDocumentSummaryPlugin,
  ],
  research: [
    wikipediaSearchPlugin,
    wikipediaArticlePlugin,
    wikidataSearchPlugin,
    wikidataEntityPlugin,
    wikidataSparqlPlugin,
    arxivSearchPlugin,
    arxivPaperPlugin,
  ],
  utility: [textOcrPlugin],
  skill: [activateSkillPlugin, readSkillFilePlugin, runSkillScriptPlugin],
  connector: allConnectorPlugins,
} as const

/**
 * Register all available plugins with the tool registry.
 *
 * @param registry - The registry to register plugins with
 *
 * @example
 * ```typescript
 * import { toolRegistry } from '@/tools'
 * import { registerAllPlugins } from '@/tools/plugins'
 *
 * registerAllPlugins(toolRegistry)
 * ```
 */
export function registerAllPlugins(registry: {
  register: (plugin: ToolPlugin<any, any>) => void
}): void {
  for (const plugin of allPlugins) {
    registry.register(plugin)
  }
}
