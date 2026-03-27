/**
 * PPTX Theme definitions derived from the platform color themes.
 *
 * Each PPTX theme maps a ColorTheme to PowerPoint-compatible settings:
 * hex colors (without #), font faces for headings and body text,
 * and a flag indicating dark vs light background.
 *
 * @module lib/pptx-themes
 */

import { COLOR_THEMES, getColorTheme, isThemeDark } from '@/lib/themes'
import type { ColorTheme } from '@/lib/themes'

// ============================================================================
// Types
// ============================================================================

export interface PptxTheme {
  /** Theme ID matching the ColorTheme id */
  id: string
  /** Human-readable label */
  label: string
  /** Primary/accent color (hex without #) */
  primaryColor: string
  /** Background for "accent" slides like title & section (hex without #) */
  accentBg: string
  /** Background for content slides (hex without #) */
  contentBg: string
  /** Text color on accent backgrounds (hex without #) */
  accentText: string
  /** Text color on content backgrounds (hex without #) */
  contentText: string
  /** Muted/secondary text on accent backgrounds (hex without #) */
  accentMuted: string
  /** Muted/secondary text on content backgrounds (hex without #) */
  contentMuted: string
  /** Font face for headings */
  headingFont: string
  /** Font face for body text */
  bodyFont: string
  /** Whether the theme has a dark content background */
  isDark: boolean
}

// ============================================================================
// Helpers
// ============================================================================

/** Strip '#' prefix and 'rgb(...)' to bare 6-digit hex. */
function toHex6(cssColor: string): string {
  if (cssColor.startsWith('#')) return cssColor.slice(1).toUpperCase()
  // Handle rgb(r, g, b)
  const m = cssColor.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (!m) return '000000'
  const r = parseInt(m[1], 10)
  const g = parseInt(m[2], 10)
  const b = parseInt(m[3], 10)
  return ((1 << 24) + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)
    .toUpperCase()
}

/** Extract only the first font name (without quotes) from a CSS font stack. */
function extractFontFace(stack: string): string {
  const first = stack.split(',')[0].trim()
  return first.replace(/['"]/g, '')
}

/**
 * Lighten a hex color by a given fraction (0–1).
 * Useful for generating muted colors from a primary.
 */
function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const nr = Math.min(255, Math.round(r + (255 - r) * amount))
  const ng = Math.min(255, Math.round(g + (255 - g) * amount))
  const nb = Math.min(255, Math.round(b + (255 - b) * amount))
  return ((1 << 24) + (nr << 16) + (ng << 8) + nb)
    .toString(16)
    .slice(1)
    .toUpperCase()
}

/**
 * Darken a hex color by a given fraction (0–1).
 */
function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const nr = Math.max(0, Math.round(r * (1 - amount)))
  const ng = Math.max(0, Math.round(g * (1 - amount)))
  const nb = Math.max(0, Math.round(b * (1 - amount)))
  return ((1 << 24) + (nr << 16) + (ng << 8) + nb)
    .toString(16)
    .slice(1)
    .toUpperCase()
}

// ============================================================================
// Theme conversion
// ============================================================================

/** Convert a platform ColorTheme to a PptxTheme. */
function colorThemeToPptx(ct: ColorTheme): PptxTheme {
  const primary = toHex6(ct.primaryColor)
  const bg = toHex6(ct.backgroundColor)
  const dark = isThemeDark(ct)

  return {
    id: ct.id,
    label: ct.label,
    primaryColor: primary,
    // Accent slides use the primary as background (like title, section, qna)
    accentBg: dark ? darken(bg, 0.3) : primary,
    // Content slides use the theme background
    contentBg: bg,
    // Text on accent backgrounds
    accentText: 'FFFFFF',
    // Text on content backgrounds
    contentText: dark ? 'E0E0E0' : '333333',
    // Muted text
    accentMuted: dark ? lighten(primary, 0.4) : lighten(primary, 0.5),
    contentMuted: dark ? '999999' : '888888',
    headingFont: extractFontFace(ct.headingFont),
    bodyFont: extractFontFace(ct.bodyFont),
    isDark: dark,
  }
}

// ============================================================================
// Registry
// ============================================================================

/** All PPTX themes, derived from the platform ColorThemes. */
export const PPTX_THEMES: PptxTheme[] = COLOR_THEMES.map(colorThemeToPptx)

/** Special value meaning "use whatever theme the user has active right now". */
export const PPTX_THEME_AUTO = 'auto'

/**
 * Resolve a PPTX theme by ID.
 * - `'auto'` → derive from the given current colorTheme ID.
 * - Otherwise look up directly.
 * Falls back to the 'devs' theme.
 */
export function getPptxTheme(
  pptxThemeId: string,
  currentColorThemeId?: string,
): PptxTheme {
  if (pptxThemeId === PPTX_THEME_AUTO) {
    const ct = getColorTheme(currentColorThemeId ?? 'devs')
    return colorThemeToPptx(ct)
  }
  return (
    PPTX_THEMES.find((t) => t.id === pptxThemeId) ??
    PPTX_THEMES.find((t) => t.id === 'devs')!
  )
}
