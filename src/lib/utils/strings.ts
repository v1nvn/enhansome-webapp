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

  // Words that should stay singular (gerunds, mass nouns, etc.)
  const singularExceptions = new Set([
    'authentication',
    'authorization',
    'caching',
    'deployment',
    'documentation',
    'encryption',
    'internationalization',
    'localization',
    'logging',
    'monitoring',
    'networking',
    'optimization',
    'performance',
    'research',
    'scheduling',
    'security',
    'storage',
    'translation',
    'validation',
  ])

  const words = trimmed.split(/(\s+)/)
  const lastWord = words[words.length - 1]
  if (singularExceptions.has(lastWord.toLowerCase())) {
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
  return str.replace(/[\p{Emoji}\p{Extended_Pictographic}\p{Symbol}]/gu, '')
}
