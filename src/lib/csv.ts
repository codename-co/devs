// =============================================================================
// CSV Parsing, Column Type Detection, Formatting & Sorting
// =============================================================================

/**
 * Parse CSV content into a 2D array of strings.
 * Handles quoted fields, escaped quotes, and newlines within quotes.
 */
export const parseCSV = (text: string, delimiter: string = ','): string[][] => {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"'
          i += 2
          continue
        }
        // End of quoted field
        inQuotes = false
        i++
        continue
      }
      currentField += char
      i++
    } else {
      if (char === '"') {
        inQuotes = true
        i++
      } else if (char === delimiter) {
        currentRow.push(currentField.trim())
        currentField = ''
        i++
      } else if (char === '\r' || char === '\n') {
        // End of row
        currentRow.push(currentField.trim())
        currentField = ''
        if (currentRow.some((cell) => cell !== '')) {
          rows.push(currentRow)
        }
        currentRow = []
        // Handle \r\n
        if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
          i += 2
        } else {
          i++
        }
      } else {
        currentField += char
        i++
      }
    }
  }

  // Push last field and row
  currentRow.push(currentField.trim())
  if (currentRow.some((cell) => cell !== '')) {
    rows.push(currentRow)
  }

  return rows
}

/**
 * Auto-detect delimiter for CSV content
 */
export const detectDelimiter = (text: string): string => {
  const firstLine = text.split(/\r?\n/)[0] || ''
  const tabCount = (firstLine.match(/\t/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  const semicolonCount = (firstLine.match(/;/g) || []).length

  if (tabCount > commaCount && tabCount > semicolonCount) return '\t'
  if (semicolonCount > commaCount) return ';'
  return ','
}

/** Maximum rows to render at once for performance */
export const CSV_MAX_VISIBLE_ROWS = 500

// =============================================================================
// Column Type Detection
// =============================================================================

export type ColumnType = 'number' | 'date' | 'boolean' | 'string'

const BOOLEAN_TRUE = new Set([
  'true',
  'yes',
  '1',
  'on',
  'oui',
  'ja',
  'sí',
  'si',
  'نعم',
  '예',
])
const BOOLEAN_FALSE = new Set([
  'false',
  'no',
  '0',
  'off',
  'non',
  'nein',
  'لا',
  '아니오',
])
const BOOLEAN_ALL = new Set([...BOOLEAN_TRUE, ...BOOLEAN_FALSE])

/** Check whether a raw cell value is boolean-ish */
export const isBooleanValue = (v: string): boolean =>
  BOOLEAN_ALL.has(v.toLowerCase().trim())

/** Resolve a boolean-ish value to true/false */
export const toBooleanValue = (v: string): boolean =>
  BOOLEAN_TRUE.has(v.toLowerCase().trim())

/** A handful of common ISO / locale date patterns */
const DATE_PATTERNS = [
  // ISO 8601: 2024-01-15 or 2024-01-15T10:30:00Z
  /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/,
  // US date: 01/15/2024 or 1/15/2024, optionally with time
  /^\d{1,2}\/\d{1,2}\/\d{2,4}(\s+\d{1,2}:\d{2}(:\d{2})?)?$/,
  // EU date: 15.01.2024 or 15-01-2024, optionally with time
  /^\d{1,2}[.\-]\d{1,2}[.\-]\d{2,4}(\s+\d{1,2}:\d{2}(:\d{2})?)?$/,
  // Time-only: 10:30 or 10:30:00
  /^\d{1,2}:\d{2}(:\d{2})?$/,
]

export const looksLikeDate = (v: string): boolean => {
  if (!v) return false
  // Quick reject: pure numbers
  if (/^\d+$/.test(v)) return false
  if (DATE_PATTERNS.some((p) => p.test(v.trim()))) return true
  // Try native parser as last resort – only accept if result is reasonable
  const ts = Date.parse(v)
  if (isNaN(ts)) return false
  const yr = new Date(ts).getFullYear()
  return yr >= 1900 && yr <= 2100
}

/**
 * Infer column types by sampling up to 100 non-empty data rows.
 * A column is typed when ≥ 80 % of non-empty samples match the type.
 */
export const inferColumnTypes = (
  dataRows: string[][],
  colCount: number,
): ColumnType[] => {
  const sampleSize = Math.min(dataRows.length, 100)
  const types: ColumnType[] = []

  for (let col = 0; col < colCount; col++) {
    let numCount = 0
    let dateCount = 0
    let boolCount = 0
    let total = 0

    for (let row = 0; row < sampleSize; row++) {
      const cell = (dataRows[row]?.[col] ?? '').trim()
      if (cell === '') continue
      total++

      // Number (incl. negative, decimals, thousands separators)
      if (looksLikeNumber(cell)) numCount++
      if (isBooleanValue(cell)) boolCount++
      if (looksLikeDate(cell)) dateCount++
    }

    const threshold = total * 0.8
    if (total === 0) {
      types.push('string')
    } else if (boolCount >= threshold) {
      types.push('boolean')
    } else if (dateCount >= threshold) {
      types.push('date')
    } else if (numCount >= threshold) {
      types.push('number')
    } else {
      types.push('string')
    }
  }
  return types
}

// =============================================================================
// Number Parsing
// =============================================================================

/**
 * Check whether a raw cell value looks like a number.
 * Handles EU formatting (space/dot as thousands, comma as decimal)
 * and US formatting (comma as thousands, dot as decimal).
 */
export const looksLikeNumber = (v: string): boolean => {
  const trimmed = v.trim()
  if (trimmed === '') return false
  return !isNaN(normalizeNumber(trimmed))
}

/**
 * Normalize a raw number string to a JS number.
 * Detects EU vs US formatting by looking at the last separator:
 *   - "22 949,7"  → 22949.7   (EU: comma = decimal)
 *   - "1,234.56"  → 1234.56   (US: dot = decimal)
 *   - "22 698"    → 22698     (space-only thousands)
 */
export const normalizeNumber = (v: string): number => {
  let s = v.trim()
  // Strip leading +
  if (s.startsWith('+')) s = s.slice(1)
  // Remove all whitespace (thousands in EU / some locales)
  s = s.replace(/\s/g, '')

  // Determine which of , or . is the decimal separator.
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')

  if (lastComma > lastDot) {
    // Comma appears after dot (or no dot) → comma is decimal (EU)
    // e.g. "1.234,56" or "22949,7"
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (lastDot > lastComma) {
    // Dot appears after comma (or no comma) → dot is decimal (US)
    // e.g. "1,234.56"
    s = s.replace(/,/g, '')
  } else {
    // No comma and no dot, or both absent → just strip commas
    s = s.replace(/,/g, '')
  }

  return Number(s)
}

/** Parse a raw cell to a numeric value (handles locale separators) */
export const parseNumericValue = (v: string): number => {
  return normalizeNumber(v)
}

// =============================================================================
// Date Parsing
// =============================================================================

/**
 * Parse a raw cell to a Date.
 * Handles EU-style dd-mm-yyyy (with optional time) and ISO formats.
 */
export const parseDateValue = (v: string): Date | null => {
  const trimmed = v.trim()

  // Try EU-style: dd-mm-yyyy or dd.mm.yyyy or dd/mm/yyyy, optionally followed by HH:mm:ss
  const euMatch = trimmed.match(
    /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?$/,
  )
  if (euMatch) {
    const [, d, m, y, time] = euMatch
    const year = y.length === 2 ? `20${y}` : y
    // Build ISO-like string: yyyy-mm-ddTHH:mm:ss
    const isoStr = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}${time ? `T${time}` : ''}`
    const ts = Date.parse(isoStr)
    if (!isNaN(ts)) return new Date(ts)
    // Fallback: swap d/m in case the day/month were ambiguous
    const isoStr2 = `${year}-${d.padStart(2, '0')}-${m.padStart(2, '0')}${time ? `T${time}` : ''}`
    const ts2 = Date.parse(isoStr2)
    if (!isNaN(ts2)) return new Date(ts2)
  }

  // Try ISO / native parser
  const ts = Date.parse(trimmed)
  if (!isNaN(ts)) {
    const date = new Date(ts)
    const yr = date.getFullYear()
    if (yr >= 1900 && yr <= 2100) return date
  }

  return null
}

// =============================================================================
// Formatters
// =============================================================================

/** Format a number for display, locale-aware */
export const formatNumber = (raw: string, lang: string): string => {
  const num = parseNumericValue(raw)
  if (isNaN(num)) return raw
  // Preserve integer display for whole numbers
  const isInteger = Number.isInteger(num)
  try {
    return new Intl.NumberFormat(lang, {
      maximumFractionDigits: isInteger ? 0 : 6,
    }).format(num)
  } catch {
    return raw
  }
}

/** Format a date for display, locale-aware */
export const formatDate = (raw: string, lang: string): string => {
  const d = parseDateValue(raw)
  if (!d) return raw
  try {
    // If the raw value contains a time component, show date + time
    if (
      raw.includes('T') ||
      raw.includes(':') ||
      raw.toLowerCase().includes('am') ||
      raw.toLowerCase().includes('pm')
    ) {
      return new Intl.DateTimeFormat(lang, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d)
    }
    return new Intl.DateTimeFormat(lang, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d)
  } catch {
    return raw
  }
}

// =============================================================================
// Sort Comparators
// =============================================================================

export const compareCells = (
  aRaw: string,
  bRaw: string,
  colType: ColumnType,
  direction: 'asc' | 'desc',
): number => {
  const a = aRaw.trim()
  const b = bRaw.trim()

  // Empty cells always sort last
  if (a === '' && b === '') return 0
  if (a === '') return 1
  if (b === '') return -1

  let cmp = 0

  switch (colType) {
    case 'number': {
      cmp = parseNumericValue(a) - parseNumericValue(b)
      break
    }
    case 'date': {
      const da = parseDateValue(a)
      const db = parseDateValue(b)
      if (da && db) {
        cmp = da.getTime() - db.getTime()
      } else {
        cmp = a.localeCompare(b)
      }
      break
    }
    case 'boolean': {
      const ba = toBooleanValue(a) ? 1 : 0
      const bb = toBooleanValue(b) ? 1 : 0
      cmp = ba - bb
      break
    }
    default:
      cmp = a.localeCompare(b, undefined, { sensitivity: 'base' })
  }

  return direction === 'asc' ? cmp : -cmp
}

// =============================================================================
// Column Type Badge Metadata
// =============================================================================

export const TYPE_BADGE: Record<ColumnType, { label: string }> = {
  number: { label: '#' },
  date: { label: '📅' },
  boolean: { label: '☑' },
  string: { label: 'Aa' },
}
