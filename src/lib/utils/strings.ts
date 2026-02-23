/**
 * String utility functions
 */

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
 * Pluralize a category name for consistency
 */
export function pluralize(name: string): string {
  const lower = name.toLowerCase().trim()

  // Words that should stay singular
  const singularExceptions = [
    'Authentication',
    'Authorization',
    'Caching',
    'Deployment',
    'Documentation',
    'Encryption',
    'Internationalization',
    'Localization',
    'Logging',
    'Monitoring',
    'Networking',
    'Optimization',
    'Performance',
    'Research',
    'Scheduling',
    'Security',
    'Storage',
    'Translation',
    'Validation',
  ]

  if (singularExceptions.some(e => e.toLowerCase() === lower)) {
    return name
  }

  // Already plural or exceptions
  const pluralOrExceptions = [
    'APIs',
    'CSS',
    'CI/CD',
    'CMS',
    'Data',
    'GUI',
    'HR',
    'IDEs',
    'iOS',
    'LLMs',
    'ML',
    'OAuth',
    'ORMs',
    'SDKs',
    'SQL',
    'UI',
    'UX',
    'Web3',
    'WebSockets',
  ]

  if (pluralOrExceptions.some(e => e.toLowerCase() === lower)) {
    return name
  }

  // Simple pluralization rules
  if (lower.endsWith('y')) {
    return name.slice(0, -1) + 'ies'
  }
  if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('ch')) {
    return name + 'es'
  }
  return name + 's'
}

/**
 * Remove all emojis and special Unicode characters from a string
 */
export function removeEmojis(str: string): string {
  return str.replace(/[\p{Emoji}\p{Extended_Pictographic}\p{Symbol}]/gu, '')
}
