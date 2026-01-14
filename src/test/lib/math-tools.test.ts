/**
 * Math Tools Tests
 *
 * Tests for the math/calculation tool following TDD approach.
 * Tests cover:
 * - Basic arithmetic operations
 * - Math function support
 * - Variable injection
 * - Security validation
 * - Error handling
 *
 * @module test/lib/math-tools
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  calculate,
  isCalculateError,
  isCalculateSuccess,
  evaluateExpression,
  validateExpression,
  ExpressionSecurityError,
  MathSandbox,
  destroyDefaultSandbox,
} from '@/lib/math-tools'
import type { CalculateResult, CalculateError } from '@/lib/math-tools'
import { MATH_TOOL_DEFINITIONS } from '@/lib/math-tools/types'

describe('Math Tools', () => {
  // Clean up sandbox after each test
  afterEach(() => {
    destroyDefaultSandbox()
  })

  describe('validateExpression', () => {
    it('should accept valid arithmetic expressions', () => {
      expect(() => validateExpression('2 + 2')).not.toThrow()
      expect(() => validateExpression('10 - 5')).not.toThrow()
      expect(() => validateExpression('3 * 4')).not.toThrow()
      expect(() => validateExpression('20 / 4')).not.toThrow()
      expect(() => validateExpression('10 % 3')).not.toThrow()
      expect(() => validateExpression('2 ** 8')).not.toThrow()
    })

    it('should accept expressions with parentheses', () => {
      expect(() => validateExpression('(2 + 3) * 4')).not.toThrow()
      expect(() => validateExpression('((1 + 2) * 3) / 2')).not.toThrow()
    })

    it('should accept expressions with Math functions', () => {
      expect(() => validateExpression('Math.sqrt(16)')).not.toThrow()
      expect(() => validateExpression('Math.pow(2, 8)')).not.toThrow()
      expect(() => validateExpression('Math.sin(Math.PI)')).not.toThrow()
      expect(() => validateExpression('Math.abs(-5)')).not.toThrow()
    })

    it('should accept expressions with Math constants', () => {
      expect(() => validateExpression('Math.PI')).not.toThrow()
      expect(() => validateExpression('Math.E')).not.toThrow()
      expect(() => validateExpression('2 * Math.PI')).not.toThrow()
    })

    it('should accept expressions with variables', () => {
      expect(() => validateExpression('x + y', { x: 1, y: 2 })).not.toThrow()
      expect(() =>
        validateExpression('Math.PI * radius ** 2', { radius: 5 }),
      ).not.toThrow()
    })

    it('should reject empty expressions', () => {
      expect(() => validateExpression('')).toThrow(ExpressionSecurityError)
      expect(() => validateExpression('   ')).toThrow(ExpressionSecurityError)
    })

    it('should reject expressions that are too long', () => {
      const longExpression = 'x'.repeat(1001)
      expect(() => validateExpression(longExpression)).toThrow(
        ExpressionSecurityError,
      )
    })

    it('should reject blocked keywords', () => {
      expect(() => validateExpression('eval("1+1")')).toThrow(
        ExpressionSecurityError,
      )
      expect(() => validateExpression('Function("return 1")')).toThrow(
        ExpressionSecurityError,
      )
      expect(() => validateExpression('window.alert(1)')).toThrow(
        ExpressionSecurityError,
      )
      expect(() => validateExpression('constructor')).toThrow(
        ExpressionSecurityError,
      )
    })

    it('should reject bracket notation', () => {
      expect(() => validateExpression('Math["sqrt"](16)')).toThrow(
        ExpressionSecurityError,
      )
    })

    it('should reject string literals', () => {
      expect(() => validateExpression('"hello"')).toThrow(
        ExpressionSecurityError,
      )
      expect(() => validateExpression("'test'")).toThrow(
        ExpressionSecurityError,
      )
    })

    it('should reject multiple statements', () => {
      expect(() => validateExpression('1+1; 2+2')).toThrow(
        ExpressionSecurityError,
      )
    })

    it('should reject assignment operators', () => {
      expect(() => validateExpression('x = 5')).toThrow(ExpressionSecurityError)
    })

    it('should reject unknown Math members', () => {
      expect(() => validateExpression('Math.unknownMethod()')).toThrow(
        ExpressionSecurityError,
      )
    })

    it('should reject invalid variable names', () => {
      expect(() => validateExpression('1x', { '1x': 5 })).toThrow(
        ExpressionSecurityError,
      )
    })

    it('should reject non-finite variable values', () => {
      expect(() => validateExpression('x', { x: Infinity })).toThrow(
        ExpressionSecurityError,
      )
      expect(() => validateExpression('x', { x: NaN })).toThrow(
        ExpressionSecurityError,
      )
    })
  })

  describe('evaluateExpression', () => {
    it('should evaluate basic arithmetic', () => {
      expect(evaluateExpression('2 + 2')).toBe(4)
      expect(evaluateExpression('10 - 3')).toBe(7)
      expect(evaluateExpression('4 * 5')).toBe(20)
      expect(evaluateExpression('20 / 4')).toBe(5)
      expect(evaluateExpression('10 % 3')).toBe(1)
      expect(evaluateExpression('2 ** 10')).toBe(1024)
    })

    it('should evaluate expressions with parentheses', () => {
      expect(evaluateExpression('(2 + 3) * 4')).toBe(20)
      expect(evaluateExpression('100 / (10 + 10)')).toBe(5)
    })

    it('should evaluate Math functions', () => {
      expect(evaluateExpression('Math.sqrt(16)')).toBe(4)
      expect(evaluateExpression('Math.pow(2, 8)')).toBe(256)
      expect(evaluateExpression('Math.abs(-42)')).toBe(42)
      expect(evaluateExpression('Math.floor(3.7)')).toBe(3)
      expect(evaluateExpression('Math.ceil(3.2)')).toBe(4)
      expect(evaluateExpression('Math.round(3.5)')).toBe(4)
      expect(evaluateExpression('Math.max(1, 5, 3)')).toBe(5)
      expect(evaluateExpression('Math.min(1, 5, 3)')).toBe(1)
    })

    it('should evaluate Math constants', () => {
      expect(evaluateExpression('Math.PI')).toBeCloseTo(Math.PI)
      expect(evaluateExpression('Math.E')).toBeCloseTo(Math.E)
    })

    it('should evaluate trigonometric functions', () => {
      expect(evaluateExpression('Math.sin(0)')).toBe(0)
      expect(evaluateExpression('Math.cos(0)')).toBe(1)
      expect(evaluateExpression('Math.sin(Math.PI / 2)')).toBeCloseTo(1)
    })

    it('should evaluate expressions with variables', () => {
      expect(evaluateExpression('x + y', { x: 10, y: 20 })).toBe(30)
      expect(evaluateExpression('a * b * c', { a: 2, b: 3, c: 4 })).toBe(24)
      expect(
        evaluateExpression('Math.PI * radius ** 2', { radius: 10 }),
      ).toBeCloseTo(Math.PI * 100)
    })

    it('should handle complex expressions', () => {
      expect(
        evaluateExpression(
          'Math.sqrt(a ** 2 + b ** 2)', // Pythagorean theorem
          { a: 3, b: 4 },
        ),
      ).toBe(5)

      expect(
        evaluateExpression(
          '(principal * rate * time) / 100', // Simple interest
          { principal: 1000, rate: 5, time: 2 },
        ),
      ).toBe(100)
    })

    it('should handle edge cases with numbers', () => {
      expect(evaluateExpression('0 / 1')).toBe(0)
      expect(evaluateExpression('1 / 0')).toBe(Infinity)
      expect(evaluateExpression('-1 / 0')).toBe(-Infinity)
    })
  })

  describe('calculate (async)', () => {
    it('should return success result for valid expressions', async () => {
      const result = await calculate({ expression: 'Math.sqrt(144)' })

      expect(isCalculateSuccess(result)).toBe(true)
      if (isCalculateSuccess(result)) {
        expect(result.result).toBe(12)
        expect(result.formatted).toBe('12')
      }
    })

    it('should handle complex calculations', async () => {
      const result = await calculate({
        expression: 'Math.pow(2, 10) + Math.sqrt(256)',
        precision: 2,
      })

      expect(isCalculateSuccess(result)).toBe(true)
      if (isCalculateSuccess(result)) {
        expect(result.result).toBe(1040)
      }
    })

    it('should work with variables', async () => {
      const result = await calculate({
        expression: 'Math.PI * radius ** 2 * height / 3', // Cone volume
        variables: { radius: 3, height: 10 },
        precision: 4,
      })

      expect(isCalculateSuccess(result)).toBe(true)
      if (isCalculateSuccess(result)) {
        expect(result.result).toBeCloseTo((Math.PI * 9 * 10) / 3)
      }
    })
  })

  describe('MathSandbox', () => {
    let sandbox: MathSandbox

    beforeEach(() => {
      sandbox = new MathSandbox()
      sandbox.init()
    })

    afterEach(() => {
      sandbox.destroy()
    })

    it('should evaluate expressions', async () => {
      const result = await sandbox.evaluate('2 + 2')
      expect(result).toBe(4)
    })

    it('should evaluate expressions with variables', async () => {
      const result = await sandbox.evaluate('x * y', { x: 6, y: 7 })
      expect(result).toBe(42)
    })

    it('should evaluate Math functions', async () => {
      const result = await sandbox.evaluate('Math.sqrt(81)')
      expect(result).toBe(9)
    })

    it('should reject security violations', async () => {
      await expect(sandbox.evaluate('eval("1")')).rejects.toThrow()
    })
  })

  describe('MATH_TOOL_DEFINITIONS', () => {
    it('should have calculate tool definition', () => {
      expect(MATH_TOOL_DEFINITIONS.calculate).toBeDefined()
      expect(MATH_TOOL_DEFINITIONS.calculate.type).toBe('function')
      expect(MATH_TOOL_DEFINITIONS.calculate.function.name).toBe('calculate')
    })

    it('should have valid parameter schema', () => {
      const params = MATH_TOOL_DEFINITIONS.calculate.function.parameters

      expect(params.type).toBe('object')
      expect(params.properties.expression).toBeDefined()
      expect(params.properties.expression.type).toBe('string')
      expect(params.properties.variables).toBeDefined()
      expect(params.properties.precision).toBeDefined()
      expect(params.required).toContain('expression')
    })

    it('should have descriptive function description', () => {
      const description = MATH_TOOL_DEFINITIONS.calculate.function.description

      expect(description).toContain('mathematical')
      expect(description).toContain('Math')
    })
  })

  describe('Type guards', () => {
    it('isCalculateSuccess should correctly identify success results', () => {
      const success: CalculateResult = {
        result: 4,
        expression: '2+2',
        formatted: '4',
        executionTime: 1,
      }
      const error: CalculateError = {
        error: 'syntax',
        message: 'Invalid',
        expression: '',
      }

      expect(isCalculateSuccess(success)).toBe(true)
      expect(isCalculateSuccess(error)).toBe(false)
    })

    it('isCalculateError should correctly identify error results', () => {
      const success: CalculateResult = {
        result: 4,
        expression: '2+2',
        formatted: '4',
        executionTime: 1,
      }
      const error: CalculateError = {
        error: 'syntax',
        message: 'Invalid',
        expression: '',
      }

      expect(isCalculateError(error)).toBe(true)
      expect(isCalculateError(success)).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('should handle very large numbers', async () => {
      const result = await calculate({ expression: 'Math.pow(10, 100)' })

      expect(isCalculateSuccess(result)).toBe(true)
      if (isCalculateSuccess(result)) {
        expect(result.result).toBe(1e100)
      }
    })

    it('should handle very small numbers', async () => {
      const result = await calculate({
        expression: 'Math.pow(10, -100)',
        precision: 10,
      })

      expect(isCalculateSuccess(result)).toBe(true)
      if (isCalculateSuccess(result)) {
        expect(result.result).toBe(1e-100)
        expect(result.formatted).toContain('e')
      }
    })

    it('should handle negative numbers', async () => {
      const result = await calculate({ expression: '-5 + (-3)' })

      expect(isCalculateSuccess(result)).toBe(true)
      if (isCalculateSuccess(result)) {
        expect(result.result).toBe(-8)
      }
    })

    it('should handle decimal numbers', async () => {
      const result = await calculate({
        expression: '0.1 + 0.2',
        precision: 1,
      })

      expect(isCalculateSuccess(result)).toBe(true)
      if (isCalculateSuccess(result)) {
        expect(result.result).toBeCloseTo(0.3)
      }
    })

    it('should handle zero division', async () => {
      const result = await calculate({ expression: '1 / 0' })

      expect(isCalculateSuccess(result)).toBe(true)
      if (isCalculateSuccess(result)) {
        expect(result.result).toBe(Infinity)
        expect(result.formatted).toBe('Infinity')
      }
    })
  })
})
