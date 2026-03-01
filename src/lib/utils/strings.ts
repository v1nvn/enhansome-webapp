/**
 * String utility functions
 */

import pluralizeLib from 'pluralize-esm'

/**
 * Format a slug-like string into a readable label
 */
export function formatLabel(slug: string): string {
  return slug
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Generate a URL-friendly slug from a string
 * Converts to lowercase, replaces special chars with hyphens
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and') // Convert & to "and"
    .replace(/\//g, '-') // Convert slashes to hyphens
    .replace(/[^\w\s-]/g, '') // Remove special chars except word, space, hyphen
    .trim()
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
}

/**
 * Normalize special characters (full-width to half-width)
 */
export function normalizeSpecialChars(str: string): string {
  return str
    .replace(/[／]/g, '/') // Normalize full-width slash
    .replace(/[－]/g, '-') // Normalize full-width hyphen
    .replace(/[：]/g, ':') // Normalize full-width colon
}

/**
 * Pluralize a category name for consistency.
 * Only pluralizes the last word, leaving multi-word names intact.
 */
export function pluralize(name: string): string {
  const trimmed = name.trim()

  // Mass nouns and other words that should never be pluralized
  const singularExceptions = new Set([
    'authentication',
    'authorization',
    'compliance',
    'data',
    'deployment',
    'documentation',
    'encryption',
    'hardware',
    'infrastructure',
    'internationalization',
    'localization',
    'media',
    'middleware',
    'optimization',
    'performance',
    'research',
    'security',
    'software',
    'storage',
    'validation',
  ])

  const words = trimmed.split(/(\s+)/)
  const lastWord = words[words.length - 1]
  const lastWordLower = lastWord.toLowerCase()

  // Rule: if the last word ends in -ing (gerund/present participle), don't pluralize
  // This catches "programming", "debugging", "testing", "streaming", "monitoring", etc.
  if (lastWordLower.endsWith('ing')) {
    return trimmed
  }

  // Rule: if the last word ends in -ment, don't pluralize
  // This catches "management", "development", "environment", etc.
  if (lastWordLower.endsWith('ment')) {
    return trimmed
  }

  if (singularExceptions.has(lastWordLower)) {
    return trimmed
  }

  // If the last word is already plural, return as-is
  if (pluralizeLib.isPlural(lastWord)) {
    return trimmed
  }

  // Pluralize only the last word
  words[words.length - 1] = pluralizeLib.plural(words[words.length - 1])
  return words.join('')
}

/**
 * Remove all emojis and special Unicode characters from a string
 */
export function removeEmojis(str: string): string {
  // Use Extended_Pictographic + Emoji_Presentation to target actual emoji
  // without catching ASCII symbols like & and / (which \p{Symbol} matches)
  return str.replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, '')
}
