/**
 * Slugify Utility
 *
 * Generate URL-friendly slugs from strings with uniqueness support
 */

/**
 * Convert a string to a URL-friendly slug
 *
 * - Converts to lowercase
 * - Removes accents/diacritics
 * - Replaces spaces and special chars with hyphens
 * - Removes consecutive hyphens
 * - Trims leading/trailing hyphens
 *
 * @param str - The string to slugify
 * @param maxLength - Maximum length of the slug (default: 50)
 * @returns URL-friendly slug
 */
export function slugify(str: string, maxLength = 50): string {
  if (!str) return ''

  return str
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars except hyphens
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-') // Multiple hyphens to single
    .replace(/^-|-$/g, '') // Trim leading/trailing hyphens
    .slice(0, maxLength)
}

/**
 * Generate a unique slug by appending a number suffix if needed
 *
 * @param baseSlug - The base slug to start from
 * @param existingSlugs - Set or array of existing slugs to check against
 * @param excludeSlug - Optional slug to exclude from uniqueness check (for updates)
 * @returns A unique slug
 */
export function generateUniqueSlug(
  baseSlug: string,
  existingSlugs: Set<string> | string[],
  excludeSlug?: string,
): string {
  const slugSet =
    existingSlugs instanceof Set ? existingSlugs : new Set(existingSlugs)

  // If base slug is unique (or same as excluded), return it
  if (!slugSet.has(baseSlug) || baseSlug === excludeSlug) {
    return baseSlug
  }

  // Try appending numbers until we find a unique one
  let counter = 2
  let candidateSlug = `${baseSlug}-${counter}`

  while (slugSet.has(candidateSlug) && candidateSlug !== excludeSlug) {
    counter++
    candidateSlug = `${baseSlug}-${counter}`

    // Safety limit to prevent infinite loops
    if (counter > 1000) {
      // Fallback: append timestamp
      return `${baseSlug}-${Date.now()}`
    }
  }

  return candidateSlug
}
