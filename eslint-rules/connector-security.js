/**
 * Custom ESLint plugin: connector-security
 *
 * Enforces secure handling of fields annotated with @sensitivity tags
 * in the connectors feature. Two rules:
 *
 * 1. `no-sensitive-logging` — Flags console.log/warn/error/debug calls
 *    that directly reference known sensitive identifiers (tokens, secrets, PII).
 *
 * 2. `require-error-sanitization` — Flags assignments to `errorMessage`
 *    properties that don't go through `sanitizeErrorMessage()` or
 *    `sanitizeError()`.
 */

// ============================================================================
// Shared Constants
// ============================================================================

/**
 * Known sensitive identifiers (@sensitivity critical + high).
 * Matches variable names, property names, and destructured bindings.
 */
const CRITICAL_IDENTIFIERS = new Set([
  // @sensitivity critical
  'accessToken',
  'refreshToken',
  'encryptedToken',
  'encryptedRefreshToken',
  'codeVerifier',
  'clientSecret',
  'encryptedCredential',
  // @sensitivity high
  'tokenIv',
  'refreshTokenIv',
  'accountEmail',
  'accountId',
])

/**
 * Console methods that should not log sensitive data.
 */
const CONSOLE_METHODS = new Set(['log', 'warn', 'error', 'debug', 'info'])

/**
 * Sanitizer function names that are considered safe wrappers.
 */
const SANITIZER_FUNCTIONS = new Set(['sanitizeErrorMessage', 'sanitizeError'])

// ============================================================================
// Helpers
// ============================================================================

/**
 * Recursively check if an AST node references any sensitive identifier.
 * Returns the name of the first sensitive identifier found, or null.
 */
function findSensitiveReference(node) {
  if (!node) return null

  switch (node.type) {
    case 'Identifier':
      return CRITICAL_IDENTIFIERS.has(node.name) ? node.name : null

    case 'MemberExpression':
      // e.g. connector.encryptedToken or result.accessToken
      if (
        node.property.type === 'Identifier' &&
        CRITICAL_IDENTIFIERS.has(node.property.name)
      ) {
        return node.property.name
      }
      // Also check computed: obj['accessToken']
      if (
        node.computed &&
        node.property.type === 'Literal' &&
        typeof node.property.value === 'string' &&
        CRITICAL_IDENTIFIERS.has(node.property.value)
      ) {
        return node.property.value
      }
      return null

    case 'TemplateLiteral':
      for (const expr of node.expressions) {
        const found = findSensitiveReference(expr)
        if (found) return found
      }
      return null

    case 'ConditionalExpression':
      return (
        findSensitiveReference(node.consequent) ||
        findSensitiveReference(node.alternate)
      )

    case 'LogicalExpression':
    case 'BinaryExpression':
      return (
        findSensitiveReference(node.left) || findSensitiveReference(node.right)
      )

    case 'CallExpression':
      // Allow sanitizer calls — they're safe
      if (
        node.callee.type === 'Identifier' &&
        SANITIZER_FUNCTIONS.has(node.callee.name)
      ) {
        return null
      }
      // Check arguments of other calls
      for (const arg of node.arguments) {
        const found = findSensitiveReference(arg)
        if (found) return found
      }
      return null

    case 'SpreadElement':
      return findSensitiveReference(node.argument)

    default:
      return null
  }
}

/**
 * Check if a node is a call to one of the sanitizer functions.
 */
function isSanitizerCall(node) {
  if (!node || node.type !== 'CallExpression') return false

  const callee = node.callee

  // Direct call: sanitizeErrorMessage(...)
  if (callee.type === 'Identifier' && SANITIZER_FUNCTIONS.has(callee.name)) {
    return true
  }

  // Member call: SomeModule.sanitizeErrorMessage(...)
  if (
    callee.type === 'MemberExpression' &&
    callee.property.type === 'Identifier' &&
    SANITIZER_FUNCTIONS.has(callee.property.name)
  ) {
    return true
  }

  return false
}

/**
 * Check if a value is a safe literal (string constant, undefined, or undefined-ish).
 */
function isSafeLiteral(node) {
  if (!node) return false
  // String literal or undefined are safe
  if (node.type === 'Literal' && typeof node.value === 'string') return true
  if (node.type === 'Identifier' && node.name === 'undefined') return true
  // void 0
  if (node.type === 'UnaryExpression' && node.operator === 'void') return true
  return false
}

// ============================================================================
// Rule: no-sensitive-logging
// ============================================================================

const noSensitiveLogging = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow console logging of fields annotated with @sensitivity critical or high',
      category: 'Security',
    },
    messages: {
      sensitiveLogged:
        "Do not log '{{name}}' (@sensitivity {{level}}). Use import.meta.env.DEV guard or remove the sensitive reference.",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        // Match console.log/warn/error/debug/info
        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.object.type !== 'Identifier' ||
          node.callee.object.name !== 'console' ||
          node.callee.property.type !== 'Identifier' ||
          !CONSOLE_METHODS.has(node.callee.property.name)
        ) {
          return
        }

        // Check if already inside an `if (import.meta.env.DEV)` block
        let parent = node.parent
        while (parent) {
          if (parent.type === 'IfStatement') {
            const test = parent.test
            // Check for import.meta.env.DEV
            if (
              test.type === 'MemberExpression' &&
              test.property.type === 'Identifier' &&
              test.property.name === 'DEV'
            ) {
              return // Guarded — skip
            }
          }
          parent = parent.parent
        }

        // Check each argument for sensitive references
        for (const arg of node.arguments) {
          const sensitiveField = findSensitiveReference(arg)
          if (sensitiveField) {
            const level = [
              'accessToken',
              'refreshToken',
              'encryptedToken',
              'encryptedRefreshToken',
              'codeVerifier',
              'clientSecret',
              'encryptedCredential',
            ].includes(sensitiveField)
              ? 'critical'
              : 'high'

            context.report({
              node: arg,
              messageId: 'sensitiveLogged',
              data: {
                name: sensitiveField,
                level,
              },
            })
          }
        }
      },
    }
  },
}

// ============================================================================
// Rule: require-error-sanitization
// ============================================================================

const requireErrorSanitization = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require error messages assigned to errorMessage fields to be sanitized via sanitizeErrorMessage()',
      category: 'Security',
    },
    messages: {
      unsanitizedError:
        "Wrap this value in sanitizeErrorMessage() before assigning to 'errorMessage'. Raw error messages may contain tokens or secrets.",
    },
    schema: [],
  },
  create(context) {
    /**
     * Check if an assignment to `errorMessage` uses a sanitized value.
     */
    function checkErrorMessageAssignment(valueNode) {
      // Allow: undefined, string literals, sanitizer calls
      if (!valueNode) return
      if (isSafeLiteral(valueNode)) return
      if (isSanitizerCall(valueNode)) return

      // Allow: ternary where both branches are safe
      if (valueNode.type === 'ConditionalExpression') {
        checkErrorMessageAssignment(valueNode.consequent)
        checkErrorMessageAssignment(valueNode.alternate)
        return
      }

      // Allow: logical expression (e.g., sanitizeErrorMessage(x) || 'fallback')
      if (valueNode.type === 'LogicalExpression') {
        checkErrorMessageAssignment(valueNode.left)
        checkErrorMessageAssignment(valueNode.right)
        return
      }

      // Flag everything else
      context.report({
        node: valueNode,
        messageId: 'unsanitizedError',
      })
    }

    return {
      // Object property: { errorMessage: someValue }
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'errorMessage' &&
          node.value
        ) {
          checkErrorMessageAssignment(node.value)
        }
      },

      // Assignment: obj.errorMessage = someValue
      AssignmentExpression(node) {
        if (
          node.left.type === 'MemberExpression' &&
          node.left.property.type === 'Identifier' &&
          node.left.property.name === 'errorMessage'
        ) {
          checkErrorMessageAssignment(node.right)
        }
      },
    }
  },
}

// ============================================================================
// Plugin Export
// ============================================================================

export default {
  meta: {
    name: 'eslint-plugin-connector-security',
    version: '1.0.0',
  },
  rules: {
    'no-sensitive-logging': noSensitiveLogging,
    'require-error-sanitization': requireErrorSanitization,
  },
}
