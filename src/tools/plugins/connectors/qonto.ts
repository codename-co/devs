/**
 * Qonto Connector Plugins
 *
 * Tool plugins for Qonto banking operations.
 *
 * @module tools/plugins/connectors/qonto
 */

import { createToolPlugin } from '@/tools/registry'
import type { ToolPlugin } from '@/tools/types'
import {
  qontoListBusinessAccounts,
  qontoListTransactions,
  qontoGetTransaction,
  qontoListStatements,
  qontoGetStatement,
} from '@/features/connectors/tools/service'
import {
  QONTO_TOOL_DEFINITIONS,
  type QontoListBusinessAccountsParams,
  type QontoListBusinessAccountsResult,
  type QontoListTransactionsParams,
  type QontoListTransactionsResult,
  type QontoGetTransactionParams,
  type QontoGetTransactionResult,
  type QontoListStatementsParams,
  type QontoListStatementsResult,
  type QontoGetStatementParams,
  type QontoGetStatementResult,
} from '@/features/connectors/tools/types'

/**
 * Qonto list business accounts plugin.
 */
export const qontoListBusinessAccountsPlugin: ToolPlugin<
  QontoListBusinessAccountsParams,
  QontoListBusinessAccountsResult
> = createToolPlugin({
  metadata: {
    name: 'qonto_list_business_accounts',
    displayName: 'Qonto List Business Accounts',
    shortDescription: 'List business accounts from Qonto',
    category: 'connector',
    tags: ['connector', 'qonto', 'banking', 'accounts'],
    icon: 'Qonto',
    estimatedDuration: 1500,
  },
  definition: QONTO_TOOL_DEFINITIONS.qonto_list_business_accounts,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return qontoListBusinessAccounts(args)
  },
})

/**
 * Qonto list transactions plugin.
 */
export const qontoListTransactionsPlugin: ToolPlugin<
  QontoListTransactionsParams,
  QontoListTransactionsResult
> = createToolPlugin({
  metadata: {
    name: 'qonto_list_transactions',
    displayName: 'Qonto List Transactions',
    shortDescription: 'List transactions from Qonto',
    category: 'connector',
    tags: ['connector', 'qonto', 'banking', 'transactions'],
    icon: 'Qonto',
    estimatedDuration: 2000,
  },
  definition: QONTO_TOOL_DEFINITIONS.qonto_list_transactions,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return qontoListTransactions(args)
  },
})

/**
 * Qonto get transaction plugin.
 */
export const qontoGetTransactionPlugin: ToolPlugin<
  QontoGetTransactionParams,
  QontoGetTransactionResult
> = createToolPlugin({
  metadata: {
    name: 'qonto_get_transaction',
    displayName: 'Qonto Get Transaction',
    shortDescription: 'Get a specific transaction from Qonto',
    category: 'connector',
    tags: ['connector', 'qonto', 'banking', 'transaction'],
    icon: 'Qonto',
    estimatedDuration: 1000,
  },
  definition: QONTO_TOOL_DEFINITIONS.qonto_get_transaction,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return qontoGetTransaction(args)
  },
})

/**
 * Qonto list statements plugin.
 */
export const qontoListStatementsPlugin: ToolPlugin<
  QontoListStatementsParams,
  QontoListStatementsResult
> = createToolPlugin({
  metadata: {
    name: 'qonto_list_statements',
    displayName: 'Qonto List Statements',
    shortDescription: 'List bank statements from Qonto',
    category: 'connector',
    tags: ['connector', 'qonto', 'banking', 'statements'],
    icon: 'Qonto',
    estimatedDuration: 1500,
  },
  definition: QONTO_TOOL_DEFINITIONS.qonto_list_statements,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return qontoListStatements(args)
  },
})

/**
 * Qonto get statement plugin.
 */
export const qontoGetStatementPlugin: ToolPlugin<
  QontoGetStatementParams,
  QontoGetStatementResult
> = createToolPlugin({
  metadata: {
    name: 'qonto_get_statement',
    displayName: 'Qonto Get Statement',
    shortDescription: 'Get a specific bank statement from Qonto',
    category: 'connector',
    tags: ['connector', 'qonto', 'banking', 'statement'],
    icon: 'Qonto',
    estimatedDuration: 1000,
  },
  definition: QONTO_TOOL_DEFINITIONS.qonto_get_statement,
  handler: async (args, context) => {
    if (context?.abortSignal?.aborted) {
      throw new Error('Aborted')
    }
    return qontoGetStatement(args)
  },
})

/**
 * All Qonto plugins.
 */
export const qontoPlugins = [
  qontoListBusinessAccountsPlugin,
  qontoListTransactionsPlugin,
  qontoGetTransactionPlugin,
  qontoListStatementsPlugin,
  qontoGetStatementPlugin,
] as const

/**
 * Qonto plugin names for registration checks.
 */
export const QONTO_PLUGIN_NAMES = [
  'qonto_list_business_accounts',
  'qonto_list_transactions',
  'qonto_get_transaction',
  'qonto_list_statements',
  'qonto_get_statement',
] as const
