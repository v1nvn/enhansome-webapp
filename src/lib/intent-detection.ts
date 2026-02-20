/**
 * Intent Detection for Smart Search
 *
 * Extracts signals from natural language search queries to automatically
 * apply relevant filters and improve search results.
 */

// Noise words that don't contribute to intent
const NOISE_WORDS = new Set([
  'a',
  'about',
  'all',
  'amazing',
  'an',
  'and',
  'any',
  'app',
  'application',
  'applications',
  'apps',
  'at',
  'awesome',
  'best',
  'build',
  'building',
  'but',
  'by',
  'code',
  'coding',
  'create',
  'creating',
  'etc',
  'find',
  'for',
  'framework',
  'frameworks',
  'from',
  'get',
  'good',
  'great',
  'help',
  'in',
  'libraries',
  'library',
  'list',
  'looking',
  'make',
  'making',
  'me',
  'need',
  'on',
  'or',
  'package',
  'packages',
  'popular',
  'project',
  'projects',
  'search',
  'show',
  'some',
  'the',
  'to',
  'tool',
  'tools',
  'top',
  'use',
  'using',
  'want',
  'with',
])

// Language/technology patterns to detect
const LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
  javascript: [/\bjavascript\b/i, /\bjs\b/i],
  typescript: [/\btypescript\b/i, /\bts\b/i],
  python: [/\bpython\b/i],
  go: [/\bgolang\b/i, /\bgo\s+lang\b/i],
  rust: [/\brust\b/i],
  java: [/\bjava\b/i],
  'c++': [/\bc\+\+\b/i, /\bcpp\b/i],
  ruby: [/\bruby\b/i],
  php: [/\bphp\b/i],
  swift: [/\bswift\b/i],
  kotlin: [/\bkotlin\b/i],
  dart: [/\bdart\b/i],
  scala: [/\bscala\b/i],
  elixir: [/\belixir\b/i],
  haskell: [/\bhaskell\b/i],
  lua: [/\blua\b/i],
  r: [/\br\s+lang\b/i, /\brlang\b/i],
  matlab: [/\bmatlab\b/i],
}

// Framework patterns (mapped to their primary language)
const FRAMEWORK_PATTERNS: Record<
  string,
  { language: string; regex: RegExp[] }
> = {
  react: { regex: [/\breact\b/i, /\breact\.?js\b/i], language: 'JavaScript' },
  'react-native': {
    regex: [/\breact\s+native\b/i, /\breact\.?native\b/i, /\brn\b/i],
    language: 'JavaScript',
  },
  next: {
    regex: [/\bnext\.?js\b/i, /\bnextjs\b/i],
    language: 'JavaScript',
  },
  vue: { regex: [/\bvue\b/i, /\bvue\.?js\b/i], language: 'JavaScript' },
  nuxt: { regex: [/\bnuxt\.?js\b/i, /\bnuxt\b/i], language: 'JavaScript' },
  svelte: { regex: [/\bsvelte\b/i], language: 'JavaScript' },
  sveltekit: {
    regex: [/\bsveltekit\b/i, /\bsvelte\s+kit\b/i],
    language: 'JavaScript',
  },
  angular: {
    regex: [/\bangular\b/i, /\bangular\.?js\b/i],
    language: 'JavaScript',
  },
  solid: { regex: [/\bsolid\b/i, /\bsolid\.?js\b/i], language: 'JavaScript' },
  qwik: { regex: [/\bqwik\b/i, /\bqwik\.?js\b/i], language: 'JavaScript' },
  astro: { regex: [/\bastro\b/i], language: 'JavaScript' },
  remix: { regex: [/\bremix\b/i, /\bremix\.?js\b/i], language: 'JavaScript' },
  gatsby: { regex: [/\bgatsby\b/i], language: 'JavaScript' },
  nest: { regex: [/\bnest\.?js\b/i, /\bnestjs\b/i], language: 'JavaScript' },
  express: {
    regex: [/\bexpress\b/i, /\bexpress\.?js\b/i],
    language: 'JavaScript',
  },
  fastify: { regex: [/\bfastify\b/i], language: 'JavaScript' },
  koa: { regex: [/\bkoa\b/i], language: 'JavaScript' },
  hapi: { regex: [/\bhapi\b/i], language: 'JavaScript' },
  django: { regex: [/\bdjango\b/i], language: 'Python' },
  flask: { regex: [/\bflask\b/i], language: 'Python' },
  fastapi: { regex: [/\bfastapi\b/i, /\bfast\s+api\b/i], language: 'Python' },
  'ruby-on-rails': {
    regex: [/\brails\b/i, /\bruby\s+on\s+rails\b/i],
    language: 'Ruby',
  },
  sinatra: { regex: [/\bsinatra\b/i], language: 'Ruby' },
  laravel: { regex: [/\blaravel\b/i], language: 'PHP' },
  symfony: { regex: [/\bsymfony\b/i], language: 'PHP' },
  spring: { regex: [/\bspring\s+(boot|framework)?\b/i], language: 'Java' },
  flutter: { regex: [/\bflutter\b/i], language: 'Dart' },
  electron: { regex: [/\belectron\b/i], language: 'JavaScript' },
  tailwind: {
    regex: [/\btailwind\b/i, /\btailwind\s+css\b/i],
    language: 'JavaScript',
  },
}

// Category/use case patterns
const CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  // Charts & Visualization
  charts: [
    /\bchart\b/i,
    /\bgraph\b/i,
    /\bvisualization\b/i,
    /\bplot\b/i,
    /\bdataviz\b/i,
    /\bd3\b/i,
  ],
  // State Management
  'state-management': [
    /\bstate\s+management\b/i,
    /\bstate\s+store\b/i,
    /\bredux\b/i,
    /\bmobx\b/i,
    /\brecoil\b/i,
    /\bzustand\b/i,
    /\bpinia\b/i,
    /\bvuex\b/i,
  ],
  // Testing
  testing: [
    /\btest\b/i,
    /\btesting\b/i,
    /\bspec\b/i,
    /\bmock\b/i,
    /\bjasmine\b/i,
    /\bjest\b/i,
    /\bmocha\b/i,
    /\bcypress\b/i,
    /\bplaywright\b/i,
    /\bvitest\b/i,
  ],
  // API Clients
  'api-clients': [
    /\bapi\s+client\b/i,
    /\bhttp\s+client\b/i,
    /\bfetch\b/i,
    /\baxios\b/i,
    /\bgraphql\s+client\b/i,
    /\brest\s+client\b/i,
  ],
  // UI Components
  'ui-components': [
    /\bui\s+component/i,
    /\bcomponent\s+library\b/i,
    /\bdesign\s+system\b/i,
    /\bbutton\b/i,
    /\bform\b/i,
    /\bmodal\b/i,
    /\bdialog\b/i,
    /\bmenu\b/i,
    /\btable\b/i,
    /\bdatagrid\b/i,
  ],
  // Build Tools
  'build-tools': [
    /\bbuild\s+tool\b/i,
    /\bbundler\b/i,
    /\bwebpack\b/i,
    /\bvite\b/i,
    /\brollup\b/i,
    /\bparcel\b/i,
    /\besbuild\b/i,
    /\bbabel\b/i,
  ],
  // Authentication
  authentication: [
    /\bauth\b/i,
    /\bauthentication\b/i,
    /\blogin\b/i,
    /\boauth\b/i,
    /\bjwt\b/i,
    /\bsession\b/i,
    /\bidentity\b/i,
    /\bpassport\b/i,
  ],
  // Mobile Development
  'mobile-development': [
    /\bmobile\b/i,
    /\bandroid\b/i,
    /\bios\b/i,
    /\breact\s+native\b/i,
    /\bflutter\b/i,
    /\bionic\b/i,
    /\bcordova\b/i,
    /\bnative\b/i,
  ],
  // Database
  database: [
    /\bdatabase\b/i,
    /\bdb\b/i,
    /\bsql\b/i,
    /\bnosql\b/i,
    /\bmongodb\b/i,
    /\bpostgres\b/i,
    /\bpostgresql\b/i,
    /\bmysql\b/i,
    /\bredis\b/i,
    /\bprisma\b/i,
    /\btypeorm\b/i,
    /\bsequelize\b/i,
    /\bmikro-orm\b/i,
  ],
  // Forms
  forms: [
    /\bform\b/i,
    /\bvalidation\b/i,
    /\breact\s+hook\s+form\b/i,
    /\bformik\b/i,
  ],
  // CSS/Styling
  styling: [
    /\bcss\b/i,
    /\bstyle\b/i,
    /\bstyled/i,
    /\bscss\b/i,
    /\bsass\b/i,
    /\bless\b/i,
    /\btailwind\b/i,
    /\bemotion\b/i,
  ],
  // Logging
  logging: [
    /\blog\b/i,
    /\blogging\b/i,
    /\bwinston\b/i,
    /\bpino\b/i,
    /\bmonitoring\b/i,
  ],
  // CLI Tools
  'cli-tools': [
    /\bcli\b/i,
    /\bcommand\s+line\b/i,
    /\bterminal\b/i,
    /\bconsole\b/i,
    /\binquirer\b/i,
    /\bcommander\b/i,
    /\byargs\b/i,
  ],
}

/**
 * Detected intent signals from a search query
 */
export interface DetectedIntent {
  /** Category ID if detected (e.g., "charts", "state-management") */
  category?: string
  /** Raw search query with noise words removed */
  cleanedQuery: string
  /** Framework name if detected (e.g., "react", "vue") */
  framework?: string
  /** Language name if detected (e.g., "JavaScript", "Python") */
  language?: string
  /** Detected signals for display */
  signals: IntentSignal[]
}

/**
 * A single intent signal that can be displayed as a chip
 */
export interface IntentSignal {
  filterKey: string
  filterValue: string
  id: string
  label: string
  type: 'category' | 'framework' | 'language' | 'preset'
}

/**
 * Extract intent from a natural language search query
 */
export function extractIntent(query: string): DetectedIntent {
  const signals: IntentSignal[] = []
  let detectedFramework: string | undefined
  let detectedLanguage: string | undefined
  let detectedCategory: string | undefined

  // Detect frameworks first (they also imply language)
  for (const [frameworkId, config] of Object.entries(FRAMEWORK_PATTERNS)) {
    for (const regex of config.regex) {
      if (regex.test(query)) {
        detectedFramework = frameworkId
        detectedLanguage = config.language
        signals.push({
          type: 'framework',
          id: frameworkId,
          label: formatLabel(frameworkId),
          filterKey: 'q',
          filterValue: frameworkId, // Keep in search for better matching
        })
        break
      }
    }
    if (detectedFramework) break
  }

  // Detect languages if not already found via framework
  if (!detectedLanguage) {
    for (const [langId, regexes] of Object.entries(LANGUAGE_PATTERNS)) {
      for (const regex of regexes) {
        if (regex.test(query)) {
          detectedLanguage = langId.charAt(0).toUpperCase() + langId.slice(1)
          signals.push({
            type: 'language',
            id: langId,
            label: formatLabel(langId),
            filterKey: 'lang',
            filterValue: detectedLanguage,
          })
          break
        }
      }
      if (detectedLanguage) break
    }
  }

  // Detect categories
  for (const [catId, regexes] of Object.entries(CATEGORY_PATTERNS)) {
    for (const regex of regexes) {
      if (regex.test(query)) {
        detectedCategory = catId
        signals.push({
          type: 'category',
          id: catId,
          label: formatLabel(catId),
          filterKey: 'q',
          filterValue: catId, // Keep in search query
        })
        break
      }
    }
    if (detectedCategory) break
  }

  // Clean the query by removing detected signals and noise words
  let cleanedQuery = query.toLowerCase()

  // Remove detected framework terms
  if (detectedFramework) {
    const frameworkPatterns = FRAMEWORK_PATTERNS[detectedFramework]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (frameworkPatterns?.regex) {
      for (const regex of frameworkPatterns.regex) {
        cleanedQuery = cleanedQuery.replace(regex, ' ')
      }
    }
  }

  // Remove detected language terms
  if (detectedLanguage && !detectedFramework) {
    const langKey = detectedLanguage.toLowerCase()
    const langPatterns = LANGUAGE_PATTERNS[langKey]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (langPatterns) {
      for (const regex of langPatterns) {
        cleanedQuery = cleanedQuery.replace(regex, ' ')
      }
    }
  }

  // Remove detected category terms
  if (detectedCategory) {
    for (const regex of CATEGORY_PATTERNS[detectedCategory]) {
      cleanedQuery = cleanedQuery.replace(regex, ' ')
    }
  }

  // Remove noise words
  cleanedQuery = cleanedQuery
    .split(/\s+/)
    .filter(word => word.length > 0 && !NOISE_WORDS.has(word))
    .join(' ')

  return {
    framework: detectedFramework,
    language: detectedLanguage,
    category: detectedCategory,
    cleanedQuery: cleanedQuery.trim(),
    signals,
  }
}

/**
 * Get all detectable categories for display
 */
export function getAllDetectableCategories(): string[] {
  return Object.keys(CATEGORY_PATTERNS).sort()
}

/**
 * Get all detectable frameworks for display
 */
export function getAllDetectableFrameworks(): string[] {
  return Object.keys(FRAMEWORK_PATTERNS).sort()
}

/**
 * Get all detectable languages for display
 */
export function getAllDetectableLanguages(): string[] {
  return Object.keys(LANGUAGE_PATTERNS).sort()
}

/**
 * Format a slug-like string into a readable label
 */
function formatLabel(slug: string): string {
  return slug
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
