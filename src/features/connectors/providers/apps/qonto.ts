/**
 * Qonto Connector Provider
 *
 * Implements OAuth 2.0 authentication and API integration for Qonto.
 * Supports listing business accounts, transactions, and statements.
 */

import { BRIDGE_URL } from '@/config/bridge'

import { BaseAppConnectorProvider } from '../../connector-provider'
import type {
  Connector,
  ConnectorProviderConfig,
  OAuthResult,
  TokenRefreshResult,
  AccountInfo,
  ListOptions,
  ListResult,
  ContentResult,
  SearchResult,
  ChangesResult,
  ConnectorItem,
  ProviderMetadata,
} from '../../types'
import { registerProvider } from './registry'

// =============================================================================
// Provider Metadata
// =============================================================================

/** Self-contained metadata for Qonto provider */
export const metadata: ProviderMetadata = {
  id: 'qonto',
  name: 'Qonto',
  icon: 'Qonto',
  color: 'currentColor',
  description: 'Access business accounts, transactions, and statements',
  syncSupported: false,
  oauth: {
    authUrl: 'https://oauth.qonto.com/oauth2/auth',
    tokenUrl: `${BRIDGE_URL}/api/qonto/oauth/oauth2/token`,
    clientId: import.meta.env.VITE_QONTO_CLIENT_ID || '',
    clientSecret: '',
    scopes: ['offline_access', 'organization.read'],
    pkceRequired: true,
  },
  proxyRoutes: [
    {
      pathPrefix: '/api/qonto/oauth',
      target: 'https://oauth.qonto.com',
      credentials: { type: 'none' },
    },
    {
      pathPrefix: '/api/qonto/v2',
      target: 'https://thirdparty.qonto.com',
      targetPathPrefix: '/v2',
      credentials: { type: 'none' },
    },
  ],
}

// Register the provider
registerProvider(metadata, () => import('./qonto'))

// =============================================================================
// Constants
// =============================================================================

/** Qonto API base URL - Use gateway proxy to avoid CORS issues */
const QONTO_API_BASE = `${BRIDGE_URL}/api/qonto`

/** Qonto OAuth endpoints */
const QONTO_AUTH_URL = 'https://oauth.qonto.com/oauth2/auth'
// Use gateway proxy for token exchange
const QONTO_TOKEN_URL = `${BRIDGE_URL}/api/qonto/oauth/oauth2/token`

/** Default page size for API requests */
const DEFAULT_PAGE_SIZE = 100

// =============================================================================
// Types
// =============================================================================

/** Business account from Qonto API */
export interface QontoBankAccount {
  id: string
  name: string
  organization_id: string
  status: 'active' | 'inactive' | 'closed'
  main: boolean
  iban?: string
  bic?: string
  currency?: string
  balance?: number
  balance_cents?: number
  authorized_balance?: string
  authorized_balance_cents?: number
  updated_at?: string
  is_external_account?: boolean
  account_number?: number
}

/** Transaction from Qonto API */
export interface QontoTransaction {
  id: string
  transaction_id: string
  amount: number
  amount_cents: number
  settled_balance?: number
  settled_balance_cents?: number
  attachment_ids: string[]
  local_amount: number
  local_amount_cents: number
  side: 'credit' | 'debit'
  operation_type: string
  currency: string
  local_currency: string
  label: string
  settled_at?: string
  emitted_at?: string
  created_at?: string
  updated_at?: string
  status: 'pending' | 'declined' | 'completed'
  note?: string
  reference?: string
  vat_amount?: number
  vat_amount_cents?: number
  vat_rate?: number
  initiator_id?: string
  label_ids: string[]
  attachment_lost: boolean
  attachment_required: boolean
  card_last_digits?: string
  category?: string
  cashflow_category?: { name: string }
  cashflow_subcategory?: { name: string }
  subject_type?: string
  transfer?: {
    counterparty_account_number?: string
    counterparty_account_number_format?: string
    counterparty_bank_identifier?: string
    counterparty_bank_identifier_format?: string
  }
}

/** Statement from Qonto API */
export interface QontoStatement {
  id: string
  bank_account_id: string
  period: string
  file: {
    file_name: string
    file_content_type: string
    file_size: string
    file_url: string
  }
}

/** Pagination metadata from Qonto API */
export interface QontoPaginationMeta {
  current_page: number
  next_page: number | null
  prev_page: number | null
  total_pages: number
  total_count: number
  per_page: number
}

/** Token response from Qonto OAuth */
interface QontoTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
  id_token?: string
}

// =============================================================================
// Provider Implementation
// =============================================================================

/**
 * Qonto connector provider.
 *
 * Provides OAuth authentication and API integration for Qonto,
 * including business accounts, transactions, and statements.
 */
export class QontoProvider extends BaseAppConnectorProvider {
  readonly id = 'qonto' as const

  readonly config: ConnectorProviderConfig = {
    id: 'qonto',
    category: 'app',
    name: 'Qonto',
    icon: 'Qonto',
    color: '#5C41FF',
    capabilities: ['read'],
    supportedTypes: ['account', 'transaction', 'statement'],
    maxFileSize: 10 * 1024 * 1024,
    rateLimit: { requests: 10, windowSeconds: 1 },
  }

  /** Get the Qonto OAuth client ID from environment */
  private get clientId(): string {
    return import.meta.env.VITE_QONTO_CLIENT_ID || ''
  }

  /** Get the Qonto OAuth client secret from environment */
  private get clientSecret(): string {
    return import.meta.env.VITE_QONTO_CLIENT_SECRET || ''
  }

  /** Get the OAuth redirect URI */
  private get redirectUri(): string {
    return `${window.location.origin}/oauth/callback`
  }

  // ===========================================================================
  // OAuth Methods
  // ===========================================================================

  /**
   * Generate the Qonto OAuth authorization URL.
   *
   * @param state - State parameter for CSRF protection
   * @param codeChallenge - PKCE code challenge
   * @returns The full authorization URL
   */
  getAuthUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'offline_access organization.read',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    return `${QONTO_AUTH_URL}?${params.toString()}`
  }

  /**
   * Exchange an authorization code for access tokens.
   *
   * @param code - The authorization code from OAuth callback
   * @param codeVerifier - PKCE code verifier
   * @returns OAuth result with tokens
   * @throws Error if token exchange fails
   */
  async exchangeCode(code: string, codeVerifier: string): Promise<OAuthResult> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier,
    })

    const response = await fetch(QONTO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`)
    }

    const data: QontoTokenResponse = await response.json()

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope,
      tokenType: data.token_type,
    }
  }

  /**
   * Refresh an expired access token.
   *
   * @param connector - The connector with the refresh token
   * @returns New access token and expiration
   */
  async refreshToken(connector: Connector): Promise<TokenRefreshResult> {
    const refreshToken = await this.getDecryptedRefreshToken(connector)

    if (!refreshToken) {
      throw new Error('No refresh token available. Re-authentication required.')
    }

    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })

    const response = await fetch(QONTO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`)
    }

    const data: QontoTokenResponse = await response.json()

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    }
  }

  /**
   * Validate that a token is still valid with Qonto.
   *
   * @param token - The access token to validate
   * @returns True if the token is valid
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${QONTO_API_BASE}/v2/bank_accounts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Revoke all access for a connector.
   *
   * Note: Qonto doesn't have a public revocation endpoint.
   * Users must revoke access through Qonto settings.
   *
   * @param _connector - The connector (unused)
   */
  async revokeAccess(_connector: Connector): Promise<void> {
    // Qonto doesn't have a revocation endpoint
    // Users must manually revoke access through their Qonto settings
  }

  /**
   * Get account information for the authenticated user.
   *
   * @param token - The access token
   * @returns Account information including ID and organization name
   */
  async getAccountInfo(token: string): Promise<AccountInfo> {
    const response = await fetch(`${QONTO_API_BASE}/v2/bank_accounts`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to get account info: ${response.status} ${errorText}`,
      )
    }

    const data: { bank_accounts: QontoBankAccount[] } = await response.json()
    const mainAccount =
      data.bank_accounts.find((acc) => acc.main) || data.bank_accounts[0]

    return {
      id: mainAccount?.organization_id || 'unknown',
      name: mainAccount?.name || 'Qonto Account',
    }
  }

  // ===========================================================================
  // Content Operations
  // ===========================================================================

  /**
   * List business accounts from Qonto.
   *
   * @param connector - The connector to list from
   * @param options - Pagination options
   * @returns List of business accounts
   */
  async list(connector: Connector, options?: ListOptions): Promise<ListResult> {
    const page = options?.cursor ? parseInt(options.cursor, 10) : 1
    const perPage = options?.pageSize ?? DEFAULT_PAGE_SIZE

    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    })

    const response = await this.fetchWithAuth(
      connector,
      `${QONTO_API_BASE}/v2/bank_accounts?${params.toString()}`,
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to list accounts: ${response.status} ${errorText}`,
      )
    }

    const data: { bank_accounts: QontoBankAccount[] } = await response.json()

    const items: ConnectorItem[] = data.bank_accounts.map((account) => ({
      externalId: account.id,
      name: account.name,
      type: 'file' as const,
      fileType: 'document' as const,
      mimeType: 'application/json',
      path: `/accounts/${account.id}`,
      lastModified: account.updated_at
        ? new Date(account.updated_at)
        : new Date(),
      description: `${account.status} - ${account.iban || 'No IBAN'}`,
      metadata: {
        status: account.status,
        main: account.main,
        balance: account.balance,
        currency: account.currency,
        iban: account.iban,
      },
    }))

    return {
      items,
      hasMore: false, // Bank accounts don't paginate typically
    }
  }

  /**
   * List business accounts using raw token (for wizard flow).
   */
  async listWithToken(
    token: string,
    options?: ListOptions,
  ): Promise<ListResult> {
    const page = options?.cursor ? parseInt(options.cursor, 10) : 1
    const perPage = options?.pageSize ?? DEFAULT_PAGE_SIZE

    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    })

    const response = await this.fetchWithRawToken(
      token,
      `${QONTO_API_BASE}/v2/bank_accounts?${params.toString()}`,
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to list accounts: ${response.status} ${errorText}`,
      )
    }

    const data: { bank_accounts: QontoBankAccount[] } = await response.json()

    const items: ConnectorItem[] = data.bank_accounts.map((account) => ({
      externalId: account.id,
      name: account.name,
      type: 'file' as const,
      fileType: 'document' as const,
      mimeType: 'application/json',
      path: `/accounts/${account.id}`,
      lastModified: account.updated_at
        ? new Date(account.updated_at)
        : new Date(),
      description: `${account.status} - ${account.iban || 'No IBAN'}`,
      metadata: {
        status: account.status,
        main: account.main,
        balance: account.balance,
        currency: account.currency,
        iban: account.iban,
      },
    }))

    return {
      items,
      hasMore: false,
    }
  }

  /**
   * Read content (not applicable for Qonto - use specific methods instead).
   */
  async read(
    _connector: Connector,
    externalId: string,
  ): Promise<ContentResult> {
    // For Qonto, use specific transaction/statement methods
    return {
      content: JSON.stringify({ id: externalId }),
      mimeType: 'application/json',
    }
  }

  /**
   * Search is not supported by Qonto API.
   */
  async search(_connector: Connector, _query: string): Promise<SearchResult> {
    // Qonto doesn't have a search endpoint
    // Return empty results
    return {
      items: [],
      totalCount: 0,
    }
  }

  /**
   * Get changes is not supported by Qonto API.
   */
  async getChanges(
    _connector: Connector,
    cursor: string | null,
  ): Promise<ChangesResult> {
    // Qonto doesn't have a delta sync endpoint
    return {
      added: [],
      modified: [],
      deleted: [],
      newCursor: cursor || '',
      hasMore: false,
    }
  }

  /**
   * Normalize a Qonto item to a ConnectorItem.
   *
   * @param rawItem - The raw item from Qonto API
   * @returns Normalized ConnectorItem
   */
  normalizeItem(rawItem: unknown): ConnectorItem {
    const item = rawItem as QontoBankAccount | QontoTransaction | QontoStatement

    // Detect item type based on properties
    if ('iban' in item && 'balance' in item) {
      // It's an account
      const account = item as QontoBankAccount
      return {
        externalId: account.id,
        name: account.name,
        type: 'file',
        fileType: 'document',
        mimeType: 'application/json',
        path: `/qonto/accounts/${account.id}`,
        lastModified: account.updated_at
          ? new Date(account.updated_at)
          : new Date(),
        description: `${account.status} - ${account.iban || 'No IBAN'}`,
        metadata: {
          status: account.status,
          main: account.main,
          balance: account.balance,
          currency: account.currency,
          iban: account.iban,
        },
      }
    } else if ('emitted_at' in item && 'amount' in item) {
      // It's a transaction
      const transaction = item as QontoTransaction
      return {
        externalId: transaction.id,
        name: transaction.label,
        type: 'file',
        fileType: 'document',
        mimeType: 'application/json',
        path: `/qonto/transactions/${transaction.id}`,
        lastModified: transaction.emitted_at
          ? new Date(transaction.emitted_at)
          : new Date(),
        description: `${transaction.side} ${transaction.amount} ${transaction.currency}`,
        metadata: {
          side: transaction.side,
          operation_type: transaction.operation_type,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
        },
      }
    } else {
      // It's a statement
      const statement = item as QontoStatement
      return {
        externalId: statement.id,
        name: `Statement ${statement.id}`,
        type: 'file',
        fileType: 'document',
        mimeType: 'application/json',
        path: `/qonto/statements/${statement.id}`,
        lastModified: new Date(),
        description: `Bank statement`,
        metadata: {
          bank_account_id: statement.bank_account_id,
          period: statement.period,
          file_name: statement.file?.file_name,
        },
      }
    }
  }

  // ===========================================================================
  // Qonto-specific Methods
  // ===========================================================================

  /**
   * List business accounts.
   *
   * @param connector - The connector to use
   * @param page - Page number (default: 1)
   * @param perPage - Items per page (default: 100)
   * @returns List of business accounts with pagination meta
   */
  async listBusinessAccounts(
    connector: Connector,
    page = 1,
    perPage = 100,
  ): Promise<{
    bank_accounts: QontoBankAccount[]
    meta?: QontoPaginationMeta
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: Math.min(perPage, 100).toString(),
    })

    const response = await this.fetchWithAuth(
      connector,
      `${QONTO_API_BASE}/v2/bank_accounts?${params.toString()}`,
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to list business accounts: ${response.status} ${errorText}`,
      )
    }

    return response.json()
  }

  /**
   * List transactions for a bank account.
   *
   * @param connector - The connector to use
   * @param options - Query options
   * @returns List of transactions with pagination meta
   */
  async listTransactions(
    connector: Connector,
    options: {
      bank_account_id?: string
      iban?: string
      status?: ('pending' | 'declined' | 'completed')[]
      side?: 'credit' | 'debit'
      updated_at_from?: string
      updated_at_to?: string
      created_at_from?: string
      created_at_to?: string
      emitted_at_from?: string
      emitted_at_to?: string
      settled_at_from?: string
      settled_at_to?: string
      operation_type?: string[]
      with_attachments?: boolean
      sort_by?: string
      page?: number
      per_page?: number
    } = {},
  ): Promise<{ transactions: QontoTransaction[]; meta: QontoPaginationMeta }> {
    const params = new URLSearchParams()

    if (options.bank_account_id) {
      params.set('bank_account_id', options.bank_account_id)
    }
    if (options.iban) {
      params.set('iban', options.iban)
    }
    if (options.status) {
      options.status.forEach((s) => params.append('status[]', s))
    }
    if (options.side) {
      params.set('side', options.side)
    }
    if (options.updated_at_from) {
      params.set('updated_at_from', options.updated_at_from)
    }
    if (options.updated_at_to) {
      params.set('updated_at_to', options.updated_at_to)
    }
    if (options.created_at_from) {
      params.set('created_at_from', options.created_at_from)
    }
    if (options.created_at_to) {
      params.set('created_at_to', options.created_at_to)
    }
    if (options.emitted_at_from) {
      params.set('emitted_at_from', options.emitted_at_from)
    }
    if (options.emitted_at_to) {
      params.set('emitted_at_to', options.emitted_at_to)
    }
    if (options.settled_at_from) {
      params.set('settled_at_from', options.settled_at_from)
    }
    if (options.settled_at_to) {
      params.set('settled_at_to', options.settled_at_to)
    }
    if (options.operation_type) {
      options.operation_type.forEach((t) =>
        params.append('operation_type[]', t),
      )
    }
    if (options.with_attachments !== undefined) {
      params.set('with_attachments', options.with_attachments.toString())
    }
    if (options.sort_by) {
      params.set('sort_by', options.sort_by)
    }
    params.set('page', (options.page ?? 1).toString())
    params.set('per_page', Math.min(options.per_page ?? 100, 100).toString())

    const response = await this.fetchWithAuth(
      connector,
      `${QONTO_API_BASE}/v2/transactions?${params.toString()}`,
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to list transactions: ${response.status} ${errorText}`,
      )
    }

    return response.json()
  }

  /**
   * Get a specific transaction.
   *
   * @param connector - The connector to use
   * @param transactionId - The transaction ID
   * @param includes - Optional includes (vat_details, labels, attachments)
   * @returns The transaction details
   */
  async getTransaction(
    connector: Connector,
    transactionId: string,
    includes?: ('vat_details' | 'labels' | 'attachments')[],
  ): Promise<{ transaction: QontoTransaction }> {
    const params = new URLSearchParams()
    if (includes) {
      includes.forEach((inc) => params.append('includes[]', inc))
    }

    const url = includes?.length
      ? `${QONTO_API_BASE}/v2/transactions/${transactionId}?${params.toString()}`
      : `${QONTO_API_BASE}/v2/transactions/${transactionId}`

    const response = await this.fetchWithAuth(connector, url)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to get transaction: ${response.status} ${errorText}`,
      )
    }

    return response.json()
  }

  /**
   * List statements for the organization.
   *
   * @param connector - The connector to use
   * @param options - Query options
   * @returns List of statements with pagination meta
   */
  async listStatements(
    connector: Connector,
    options: {
      bank_account_ids?: string[]
      ibans?: string[]
      period_from?: string
      period_to?: string
      sort_by?: string
      page?: number
      per_page?: number
    } = {},
  ): Promise<{ statements: QontoStatement[]; meta: QontoPaginationMeta }> {
    const params = new URLSearchParams()

    if (options.bank_account_ids) {
      options.bank_account_ids.forEach((id) =>
        params.append('bank_account_ids[]', id),
      )
    }
    if (options.ibans) {
      options.ibans.forEach((iban) => params.append('ibans[]', iban))
    }
    if (options.period_from) {
      params.set('period_from', options.period_from)
    }
    if (options.period_to) {
      params.set('period_to', options.period_to)
    }
    if (options.sort_by) {
      params.set('sort_by', options.sort_by)
    }
    params.set('page', (options.page ?? 1).toString())
    params.set('per_page', Math.min(options.per_page ?? 100, 100).toString())

    const response = await this.fetchWithAuth(
      connector,
      `${QONTO_API_BASE}/v2/statements?${params.toString()}`,
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to list statements: ${response.status} ${errorText}`,
      )
    }

    return response.json()
  }

  /**
   * Get a specific statement.
   *
   * @param connector - The connector to use
   * @param statementId - The statement ID
   * @returns The statement details
   */
  async getStatement(
    connector: Connector,
    statementId: string,
  ): Promise<{ statement: QontoStatement }> {
    const response = await this.fetchWithAuth(
      connector,
      `${QONTO_API_BASE}/v2/statements/${statementId}`,
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to get statement: ${response.status} ${errorText}`,
      )
    }

    return response.json()
  }
}

// =============================================================================
// Export
// =============================================================================

/**
 * Singleton instance of the Qonto provider.
 */
const qontoProvider = new QontoProvider()

export default qontoProvider
