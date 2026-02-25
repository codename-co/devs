/**
 * Color theme definitions for the DEVS platform.
 *
 * Each theme defines [primaryColor, backgroundColor, headingFont, bodyFont]
 * applied via CSS custom properties on the root element.
 *
 * - `primaryColor`: accent/brand color used for buttons, links, focus rings
 * - `backgroundColor`: page-level surface color (the outermost shell)
 * - `headingFont`: font stack for headings (h1–h6, [role='heading'])
 * - `bodyFont`: font stack for body / UI text
 */

export interface ColorTheme {
  /** Unique machine-readable key */
  id: string
  /** Human-readable label (i18n key) */
  label: string
  /** CSS color value for the primary accent */
  primaryColor: string
  /** CSS color value for the page background */
  backgroundColor: string
  /** CSS font-family stack for headings */
  headingFont: string
  /** CSS font-family stack for body text */
  bodyFont: string
  /** Small swatch colors for the picker preview [primary, bg] */
  preview: [string, string]
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'devs',
    label: 'Devs',
    primaryColor: '#3366FF',
    backgroundColor: 'rgb(244, 247, 249)',
    headingFont: "'EB Garamond', Georgia, serif",
    bodyFont: "'Figtree', system-ui, -apple-system, sans-serif",
    preview: ['#3366FF', '#F4F7F9'],
  },
  {
    id: 'forest',
    label: 'Forest',
    primaryColor: '#2D6A4F',
    backgroundColor: '#F0F5F1',
    headingFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Vollkorn', Georgia, serif",
    preview: ['#2D6A4F', '#F0F5F1'],
  },
  {
    id: 'solarized',
    label: 'Solarized',
    primaryColor: '#268BD2',
    backgroundColor: '#FDF6E3',
    headingFont: "'Oswald', system-ui, sans-serif",
    bodyFont: "'Quicksand', system-ui, sans-serif",
    preview: ['#268BD2', '#FDF6E3'],
  },
  {
    id: 'rose',
    label: 'Rosé',
    primaryColor: '#D4627B',
    backgroundColor: '#FFF5F7',
    headingFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Quicksand', system-ui, sans-serif",
    preview: ['#D4627B', '#FFF5F7'],
  },
  {
    id: 'ocean',
    label: 'Ocean',
    primaryColor: '#0EA5E9',
    backgroundColor: '#F0F9FF',
    headingFont: "'Oswald', system-ui, sans-serif",
    bodyFont: "'Figtree', system-ui, -apple-system, sans-serif",
    preview: ['#0EA5E9', '#F0F9FF'],
  },
  {
    id: 'ember',
    label: 'Ember',
    primaryColor: '#EA580C',
    backgroundColor: '#FFF7ED',
    headingFont: "'Oswald', system-ui, sans-serif",
    bodyFont: "'Vollkorn', Georgia, serif",
    preview: ['#EA580C', '#FFF7ED'],
  },
  {
    id: 'sakura',
    label: 'Sakura',
    primaryColor: '#EC4899',
    backgroundColor: '#FDF2F8',
    headingFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'EB Garamond', Georgia, serif",
    preview: ['#EC4899', '#FDF2F8'],
  },
  {
    id: 'night',
    label: 'Night',
    primaryColor: '#7C8FFF',
    backgroundColor: '#0F1117',
    headingFont: "'Oswald', system-ui, sans-serif",
    bodyFont: "'Figtree', system-ui, -apple-system, sans-serif",
    preview: ['#7C8FFF', '#0F1117'],
  },
  {
    id: 'dracula',
    label: 'Dracula',
    primaryColor: '#BD93F9',
    backgroundColor: '#282A36',
    headingFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Quicksand', system-ui, sans-serif",
    preview: ['#BD93F9', '#282A36'],
  },
  {
    id: 'nord',
    label: 'Nord',
    primaryColor: '#88C0D0',
    backgroundColor: '#2E3440',
    headingFont: "'Oswald', system-ui, sans-serif",
    bodyFont: "'Quicksand', system-ui, sans-serif",
    preview: ['#88C0D0', '#2E3440'],
  },
  {
    id: 'monokai',
    label: 'Monokai',
    primaryColor: '#A6E22E',
    backgroundColor: '#272822',
    headingFont: "'Oswald', system-ui, sans-serif",
    bodyFont: "'Figtree', system-ui, -apple-system, sans-serif",
    preview: ['#A6E22E', '#272822'],
  },
  {
    id: 'catppuccin',
    label: 'Catppuccin',
    primaryColor: '#CBA6F7',
    backgroundColor: '#1E1E2E',
    headingFont: "'EB Garamond', Georgia, serif",
    bodyFont: "'Quicksand', system-ui, sans-serif",
    preview: ['#CBA6F7', '#1E1E2E'],
  },
]

export const DEFAULT_COLOR_THEME = 'devs'

/**
 * Look up a theme by ID. Falls back to the default "devs" theme.
 */
export function getColorTheme(id: string): ColorTheme {
  return (
    COLOR_THEMES.find((t) => t.id === id) ??
    COLOR_THEMES.find((t) => t.id === DEFAULT_COLOR_THEME)!
  )
}

/**
 * Determine whether a theme's background is visually dark.
 * Used to force the `dark` class when a dark-background theme is active.
 */
export function isThemeDark(theme: ColorTheme): boolean {
  // Parse the background color and evaluate perceived brightness
  const hex = theme.backgroundColor.startsWith('#')
    ? theme.backgroundColor
    : rgbStringToHex(theme.backgroundColor)
  if (!hex) return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Perceived brightness formula (ITU-R BT.709)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness < 128
}

function rgbStringToHex(rgb: string): string | null {
  const match = rgb.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (!match) return null
  const r = parseInt(match[1], 10)
  const g = parseInt(match[2], 10)
  const b = parseInt(match[3], 10)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * Convert a CSS color (hex or rgb(...)) to an HSL space-separated string
 * compatible with HeroUI's CSS variable format: "H S% L%"
 */
export function colorToHsl(color: string): string {
  const hex = color.startsWith('#') ? color : rgbStringToHex(color)
  if (!hex) return '0 0% 0%'
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return `0 0% ${Math.round(l * 100)}%`
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

/**
 * Compute a readable foreground color (white or black) for a given background,
 * returned as an HSL space-separated string.
 */
export function contrastForegroundHsl(bgColor: string): string {
  const hex = bgColor.startsWith('#') ? bgColor : rgbStringToHex(bgColor)
  if (!hex) return '0 0% 100%'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness < 128 ? '0 0% 100%' : '0 0% 0%'
}

/**
 * The shade steps HeroUI generates for each semantic color.
 */
const SHADE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const

/**
 * Generate a full 50–900 shade scale from a single primary color.
 *
 * The input color is treated as the 500 (DEFAULT) shade.
 * Lighter shades mix towards white, darker shades mix towards black,
 * with hand-tuned ratios that produce a natural palette similar to
 * Tailwind / HeroUI built-in scales.
 *
 * Returns a map of shade → HSL space-separated string.
 */
export function generatePrimaryScale(
  color: string,
): Record<(typeof SHADE_STEPS)[number], string> {
  const hex = color.startsWith('#')
    ? color
    : (rgbStringToHex(color) ?? '#000000')
  const r500 = parseInt(hex.slice(1, 3), 16)
  const g500 = parseInt(hex.slice(3, 5), 16)
  const b500 = parseInt(hex.slice(5, 7), 16)

  // Mix ratios: how much white (for lighter) or black (for darker) to blend.
  // Keyed by shade, maps to [target, ratio] where target is 255 (white) or 0 (black).
  const mixMap: Record<number, [number, number]> = {
    50: [255, 0.9],
    100: [255, 0.8],
    200: [255, 0.6],
    300: [255, 0.4],
    400: [255, 0.2],
    500: [0, 0], // original
    600: [0, 0.2],
    700: [0, 0.4],
    800: [0, 0.6],
    900: [0, 0.8],
  }

  const result = {} as Record<(typeof SHADE_STEPS)[number], string>

  for (const step of SHADE_STEPS) {
    const [target, ratio] = mixMap[step]
    const mix = (c: number) => Math.round(c + (target - c) * ratio)
    const r = mix(r500)
    const g = mix(g500)
    const b = mix(b500)
    const shadeHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
    result[step] = colorToHsl(shadeHex)
  }

  return result
}
