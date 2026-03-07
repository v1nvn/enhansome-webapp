/**
 * Tag utilities
 * Light normalization for raw section headings from awesome-lists
 */

import { generateSlug, normalizeSpecialChars, removeEmojis } from './strings'

// ============================================================================
// Types
// ============================================================================

export interface NormalizedTag {
  name: string
  slug: string
}

// ============================================================================
// Tag Normalization
// ============================================================================

/**
 * Section headers from awesome-lists that aren't real tags.
 * These get filtered out entirely during indexing.
 */
const SKIP_TAGS = new Set([
  'contents',
  'contributing',
  'contributors',
  'getting started',
  'introduction',
  'license',
  'links',
  'more',
  'related',
  'related lists',
  'related projects',
  'resources',
  'see also',
  'software',
  'star history',
  'table of contents',
  'tips',
  'tips and tricks',
  'todos',
  'uncategorized',
])

/**
 * Clean and normalize a tag name from a raw section heading.
 * Light normalization only — preserves the original author's terminology.
 * Returns null if the tag should be skipped (noise section headers, etc.)
 */
export function normalizeTagName(raw: string): NormalizedTag | null {
  // Stage 1: Basic cleanup
  let cleaned = raw.trim()

  // Stage 2: Remove emojis and special Unicode
  cleaned = removeEmojis(cleaned)

  // Stage 3: Normalize special characters
  cleaned = normalizeSpecialChars(cleaned)

  // Stage 4: Remove common prefixes/suffixes and noise
  cleaned = cleaned
    .replace(/^for\s+/i, '')
    .replace(/^with\s+/i, '')
    .replace(/^using\s+/i, '')
    .replace(/^based\s+/i, '')
    .replace(/\(.*\)$/g, '')
    .replace(/\[.*\]$/g, '')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .trim()

  // Stage 5: Check if this tag should be skipped entirely
  if (shouldSkipTag(cleaned)) {
    return null
  }

  // Stage 6: Clean up extra whitespace
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9\s/&.+-]/g, '')
    .trim()

  // If empty after cleanup, skip
  if (!cleaned) return null

  // Stage 7: Title case for display name (with acronym handling)
  const words = cleaned.split(/\s+/)
  const titleCased = words
    .map(word => {
      if (
        /^[A-Z]{2,}$/.test(word) ||
        [
          'API',
          'CI',
          'CMS',
          'CSS',
          'DB',
          'GUI',
          'HR',
          'IDE',
          'iOS',
          'LLM',
          'ML',
          'OAuth',
          'ORM',
          'SDK',
          'SQL',
          'UI',
          'UX',
          'VS',
          'Web3',
        ].includes(word)
      ) {
        return word
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')

  // Stage 8: Generate slug
  const slug = generateSlug(titleCased)

  return {
    name: titleCased,
    slug,
  }
}

/**
 * Check if a raw tag name should be skipped entirely.
 */
function shouldSkipTag(name: string): boolean {
  const lower = name.toLowerCase().trim()

  // Empty or very short names (e.g., "CS", "DS", "ES", "FS", "OS", "RS")
  if (lower.length <= 2) return true

  // Exact matches to meta-section headers
  if (SKIP_TAGS.has(lower)) return true

  // "What is X?" pattern
  if (lower.startsWith('what is')) return true

  return false
}
