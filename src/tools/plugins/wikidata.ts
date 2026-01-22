/**
 * Wikidata Tool Plugin
 *
 * A tool plugin that provides access to Wikidata's structured knowledge base.
 * Wikidata is a free, collaborative, multilingual knowledge graph.
 *
 * @module tools/plugins/wikidata
 */

import { createToolPlugin } from '../registry'
import type { ToolPlugin } from '../types'
import type { ToolDefinition } from '@/lib/llm/types'

// ============================================================================
// Types
// ============================================================================

export interface WikidataSearchParams {
  /** The search query */
  query: string
  /** Maximum number of results to return (default: 10) */
  maxResults?: number
  /** Language for labels and descriptions (default: 'en') */
  language?: string
  /** Filter by entity type: item, property, or both */
  type?: 'item' | 'property'
}

export interface WikidataEntityParams {
  /** The Wikidata entity ID (e.g., 'Q42' for Douglas Adams) */
  entityId: string
  /** Language for labels and descriptions (default: 'en') */
  language?: string
  /** Include claims/statements about the entity */
  includeClaims?: boolean
}

export interface WikidataSparqlParams {
  /** SPARQL query to execute */
  query: string
}

export interface WikidataSearchResult {
  /** Entity ID (e.g., 'Q42') */
  id: string
  /** Human-readable label */
  label: string
  /** Description of the entity */
  description?: string
  /** URL to the Wikidata page */
  url: string
  /** Aliases for this entity */
  aliases?: string[]
}

export interface WikidataProperty {
  /** Property ID (e.g., 'P31' for 'instance of') */
  propertyId: string
  /** Property label */
  propertyLabel: string
  /** Value of the property */
  value: string
  /** Value type */
  valueType: 'string' | 'entity' | 'time' | 'quantity' | 'url' | 'other'
  /** Entity ID if value is an entity */
  valueEntityId?: string
}

export interface WikidataSearchResponse {
  success: true
  query: string
  results: WikidataSearchResult[]
  count: number
}

export interface WikidataEntityResponse {
  success: true
  id: string
  label: string
  description?: string
  url: string
  aliases?: string[]
  claims?: WikidataProperty[]
  sitelinks?: { site: string; title: string; url: string }[]
}

export interface WikidataSparqlResponse {
  success: true
  query: string
  results: Record<string, any>[]
  count: number
}

export interface WikidataError {
  success: false
  error: string
  code: 'not_found' | 'invalid_query' | 'network_error' | 'api_error'
}

// ============================================================================
// Wikidata API Implementation
// ============================================================================

/**
 * Search Wikidata entities.
 */
async function searchWikidata(
  params: WikidataSearchParams,
  signal?: AbortSignal,
): Promise<WikidataSearchResponse | WikidataError> {
  const { query, maxResults = 10, language = 'en', type = 'item' } = params

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return {
      success: false,
      error: 'Search query is required and must be a non-empty string',
      code: 'invalid_query',
    }
  }

  const trimmedQuery = query.trim()

  try {
    const searchParams = new URLSearchParams({
      action: 'wbsearchentities',
      search: trimmedQuery,
      language: language,
      uselang: language,
      type: type,
      limit: String(Math.min(maxResults, 50)),
      format: 'json',
      origin: '*',
    })

    const response = await fetch(
      `https://www.wikidata.org/w/api.php?${searchParams}`,
      { signal },
    )

    if (!response.ok) {
      return {
        success: false,
        error: `Wikidata API returned status ${response.status}`,
        code: 'api_error',
      }
    }

    const data = await response.json()

    if (data.error) {
      return {
        success: false,
        error: data.error.info || 'Unknown Wikidata API error',
        code: 'api_error',
      }
    }

    const results: WikidataSearchResult[] = (data.search || []).map(
      (item: any) => ({
        id: item.id,
        label: item.label || item.id,
        description: item.description,
        url: item.concepturi || `https://www.wikidata.org/wiki/${item.id}`,
        aliases: item.aliases,
      }),
    )

    return {
      success: true,
      query: trimmedQuery,
      results,
      count: results.length,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    console.warn('[Wikidata] Search failed:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown error during search',
      code: 'network_error',
    }
  }
}

/**
 * Get a Wikidata entity by ID.
 */
async function getWikidataEntity(
  params: WikidataEntityParams,
  signal?: AbortSignal,
): Promise<WikidataEntityResponse | WikidataError> {
  const { entityId, language = 'en', includeClaims = true } = params

  if (
    !entityId ||
    typeof entityId !== 'string' ||
    entityId.trim().length === 0
  ) {
    return {
      success: false,
      error: 'Entity ID is required',
      code: 'invalid_query',
    }
  }

  // Validate entity ID format (Q-number or P-number)
  const trimmedId = entityId.trim().toUpperCase()
  if (!/^[QP]\d+$/.test(trimmedId)) {
    return {
      success: false,
      error:
        'Invalid entity ID format. Expected Q-number (e.g., Q42) or P-number (e.g., P31)',
      code: 'invalid_query',
    }
  }

  try {
    const props = ['labels', 'descriptions', 'aliases', 'sitelinks']
    if (includeClaims) {
      props.push('claims')
    }

    const searchParams = new URLSearchParams({
      action: 'wbgetentities',
      ids: trimmedId,
      languages: language,
      props: props.join('|'),
      format: 'json',
      origin: '*',
    })

    const response = await fetch(
      `https://www.wikidata.org/w/api.php?${searchParams}`,
      { signal },
    )

    if (!response.ok) {
      return {
        success: false,
        error: `Wikidata API returned status ${response.status}`,
        code: 'api_error',
      }
    }

    const data = await response.json()

    if (data.error) {
      return {
        success: false,
        error: data.error.info || 'Unknown Wikidata API error',
        code: 'api_error',
      }
    }

    const entity = data.entities?.[trimmedId]
    if (!entity || entity.missing !== undefined) {
      return {
        success: false,
        error: `Entity ${trimmedId} not found`,
        code: 'not_found',
      }
    }

    // Parse claims if present
    let claims: WikidataProperty[] | undefined
    if (includeClaims && entity.claims) {
      claims = []
      for (const [propId, propClaims] of Object.entries(entity.claims)) {
        const claimArray = propClaims as any[]
        for (const claim of claimArray.slice(0, 5)) {
          // Limit to 5 values per property
          const mainsnak = claim.mainsnak
          if (!mainsnak) continue

          let value = ''
          let valueType: WikidataProperty['valueType'] = 'other'
          let valueEntityId: string | undefined

          if (mainsnak.datavalue) {
            const dv = mainsnak.datavalue
            switch (dv.type) {
              case 'string':
                value = dv.value
                valueType = 'string'
                break
              case 'wikibase-entityid':
                valueEntityId = dv.value.id
                value = dv.value.id // Will need label resolution
                valueType = 'entity'
                break
              case 'time':
                value = dv.value.time
                valueType = 'time'
                break
              case 'quantity':
                value = `${dv.value.amount} ${dv.value.unit || ''}`.trim()
                valueType = 'quantity'
                break
              default:
                value = JSON.stringify(dv.value)
            }
          }

          claims.push({
            propertyId: propId,
            propertyLabel: propId, // Would need separate lookup for label
            value,
            valueType,
            valueEntityId,
          })
        }
      }
    }

    // Parse sitelinks
    const sitelinks = entity.sitelinks
      ? Object.entries(entity.sitelinks).map(([site, link]: [string, any]) => ({
          site,
          title: link.title,
          url:
            link.url ||
            `https://${site.replace('wiki', '')}.wikipedia.org/wiki/${encodeURIComponent(link.title)}`,
        }))
      : undefined

    return {
      success: true,
      id: entity.id,
      label: entity.labels?.[language]?.value || entity.id,
      description: entity.descriptions?.[language]?.value,
      url: `https://www.wikidata.org/wiki/${entity.id}`,
      aliases: entity.aliases?.[language]?.map((a: any) => a.value),
      claims,
      sitelinks,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    console.warn('[Wikidata] Entity fetch failed:', error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error fetching entity',
      code: 'network_error',
    }
  }
}

/**
 * Execute a SPARQL query against Wikidata.
 */
async function querySparql(
  params: WikidataSparqlParams,
  signal?: AbortSignal,
): Promise<WikidataSparqlResponse | WikidataError> {
  const { query } = params

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return {
      success: false,
      error: 'SPARQL query is required',
      code: 'invalid_query',
    }
  }

  try {
    const response = await fetch(
      `https://query.wikidata.org/sparql?query=${encodeURIComponent(query.trim())}`,
      {
        headers: {
          Accept: 'application/sparql-results+json',
        },
        signal,
      },
    )

    if (!response.ok) {
      return {
        success: false,
        error: `SPARQL endpoint returned status ${response.status}`,
        code: 'api_error',
      }
    }

    const data = await response.json()

    const results = data.results?.bindings?.map((binding: any) => {
      const result: Record<string, any> = {}
      for (const [key, value] of Object.entries(binding)) {
        const v = value as any
        result[key] = v.value
        if (v.type === 'uri') {
          result[`${key}Type`] = 'uri'
        }
      }
      return result
    })

    return {
      success: true,
      query: query.trim(),
      results: results || [],
      count: results?.length || 0,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    console.warn('[Wikidata] SPARQL query failed:', error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error executing SPARQL query',
      code: 'network_error',
    }
  }
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const WIKIDATA_SEARCH_TOOL_DEFINITION: ToolDefinition = {
  type: 'function',
  function: {
    name: 'wikidata_search',
    description: `Search Wikidata for entities (items or properties). Wikidata is a structured knowledge base that provides machine-readable data about people, places, concepts, and more.

Best used for:
- Finding entity IDs for structured queries
- Looking up facts about entities
- Discovering relationships between entities
- Getting multilingual information

Returns entity IDs that can be used with wikidata_entity for detailed information.`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'The search query (e.g., "Albert Einstein", "Python programming language").',
        },
        maxResults: {
          type: 'number',
          description:
            'Maximum number of results to return (1-50). Default is 10.',
          minimum: 1,
          maximum: 50,
        },
        language: {
          type: 'string',
          description:
            'Language for labels and descriptions (e.g., "en", "fr", "de"). Default is "en".',
        },
        type: {
          type: 'string',
          enum: ['item', 'property'],
          description:
            'Filter by entity type. "item" for things (Q-numbers), "property" for relationships (P-numbers). Default is "item".',
        },
      },
      required: ['query'],
    },
  },
}

export const WIKIDATA_ENTITY_TOOL_DEFINITION: ToolDefinition = {
  type: 'function',
  function: {
    name: 'wikidata_entity',
    description: `Get detailed information about a Wikidata entity by its ID. Returns labels, descriptions, aliases, claims (facts), and links to Wikipedia articles.

Use this after searching to get structured data about an entity. Entity IDs start with Q (items) or P (properties).

Examples:
- Q42 = Douglas Adams
- Q5 = human
- P31 = instance of
- P569 = date of birth`,
    parameters: {
      type: 'object',
      properties: {
        entityId: {
          type: 'string',
          description:
            'The Wikidata entity ID (e.g., "Q42" for Douglas Adams, "P31" for "instance of").',
        },
        language: {
          type: 'string',
          description: 'Language for labels and descriptions. Default is "en".',
        },
        includeClaims: {
          type: 'boolean',
          description:
            'Whether to include claims/statements about the entity. Default is true.',
        },
      },
      required: ['entityId'],
    },
  },
}

export const WIKIDATA_SPARQL_TOOL_DEFINITION: ToolDefinition = {
  type: 'function',
  function: {
    name: 'wikidata_sparql',
    description: `Execute a SPARQL query against Wikidata Query Service. SPARQL is a powerful query language for retrieving and manipulating data.

Use this for complex queries like:
- Finding all items with specific properties
- Aggregating data across entities
- Discovering relationships

Note: Queries should include LIMIT to avoid timeouts. Maximum execution time is 60 seconds.

Example query to find 10 humans born in 1879:
SELECT ?person ?personLabel WHERE {
  ?person wdt:P31 wd:Q5.
  ?person wdt:P569 ?dob.
  FILTER(YEAR(?dob) = 1879)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 10`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'The SPARQL query to execute. Must be a valid SPARQL query.',
        },
      },
      required: ['query'],
    },
  },
}

// ============================================================================
// Wikidata Tool Plugins
// ============================================================================

export const wikidataSearchPlugin: ToolPlugin<
  WikidataSearchParams,
  WikidataSearchResponse | WikidataError
> = createToolPlugin({
  metadata: {
    name: 'wikidata_search',
    displayName: 'Wikidata Search',
    shortDescription: 'Search Wikidata knowledge graph',
    icon: 'Database',
    category: 'research',
    tags: ['wikidata', 'knowledge-graph', 'structured-data', 'semantic-web'],
    enabledByDefault: false,
    estimatedDuration: 2000,
    requiresConfirmation: false,
  },
  definition: WIKIDATA_SEARCH_TOOL_DEFINITION,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return searchWikidata(args, context.abortSignal)
  },
  validate: (args): WikidataSearchParams => {
    const params = args as WikidataSearchParams

    if (
      params.query === undefined ||
      params.query === null ||
      typeof params.query !== 'string'
    ) {
      throw new Error('Query is required and must be a string')
    }

    if (params.query.trim().length === 0) {
      throw new Error('Query cannot be empty')
    }

    if (params.maxResults !== undefined) {
      if (
        typeof params.maxResults !== 'number' ||
        params.maxResults < 1 ||
        params.maxResults > 50
      ) {
        throw new Error('maxResults must be a number between 1 and 50')
      }
    }

    if (
      params.type !== undefined &&
      !['item', 'property'].includes(params.type)
    ) {
      throw new Error('type must be either "item" or "property"')
    }

    return params
  },
})

export const wikidataEntityPlugin: ToolPlugin<
  WikidataEntityParams,
  WikidataEntityResponse | WikidataError
> = createToolPlugin({
  metadata: {
    name: 'wikidata_entity',
    displayName: 'Wikidata Entity',
    shortDescription: 'Get Wikidata entity details',
    icon: 'Database',
    category: 'research',
    tags: ['wikidata', 'entity', 'knowledge-graph', 'structured-data'],
    enabledByDefault: false,
    estimatedDuration: 2000,
    requiresConfirmation: false,
  },
  definition: WIKIDATA_ENTITY_TOOL_DEFINITION,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return getWikidataEntity(args, context.abortSignal)
  },
  validate: (args): WikidataEntityParams => {
    const params = args as WikidataEntityParams

    if (
      params.entityId === undefined ||
      params.entityId === null ||
      typeof params.entityId !== 'string'
    ) {
      throw new Error('Entity ID is required and must be a string')
    }

    if (params.entityId.trim().length === 0) {
      throw new Error('Entity ID cannot be empty')
    }

    return params
  },
})

export const wikidataSparqlPlugin: ToolPlugin<
  WikidataSparqlParams,
  WikidataSparqlResponse | WikidataError
> = createToolPlugin({
  metadata: {
    name: 'wikidata_sparql',
    displayName: 'Wikidata SPARQL',
    shortDescription: 'Execute SPARQL queries on Wikidata',
    icon: 'Database',
    category: 'research',
    tags: ['wikidata', 'sparql', 'query', 'knowledge-graph'],
    enabledByDefault: false,
    estimatedDuration: 5000,
    requiresConfirmation: false,
  },
  definition: WIKIDATA_SPARQL_TOOL_DEFINITION,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return querySparql(args, context.abortSignal)
  },
  validate: (args): WikidataSparqlParams => {
    const params = args as WikidataSparqlParams

    if (
      params.query === undefined ||
      params.query === null ||
      typeof params.query !== 'string'
    ) {
      throw new Error('SPARQL query is required and must be a string')
    }

    if (params.query.trim().length === 0) {
      throw new Error('SPARQL query cannot be empty')
    }

    return params
  },
})

/**
 * All Wikidata plugins for convenience.
 */
export const wikidataPlugins: ToolPlugin<any, any>[] = [
  wikidataSearchPlugin,
  wikidataEntityPlugin,
  wikidataSparqlPlugin,
]
