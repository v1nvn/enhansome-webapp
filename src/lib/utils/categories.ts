/**
 * Category utilities
 * Consolidates category normalization and matching
 */

import {
  generateSlug,
  normalizeSpecialChars,
  pluralize,
  removeEmojis,
} from './strings'

import type { D1Database } from '@cloudflare/workers-types'

// ============================================================================
// Types
// ============================================================================

export interface NormalizedCategory {
  name: string
  slug: string
}

// ============================================================================
// Category Normalization
// ============================================================================

/**
 * Section headers from awesome-lists that aren't real categories.
 * These get filtered out entirely during indexing.
 */
const SKIP_CATEGORIES = new Set([
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
 * Check if a raw category name should be skipped entirely.
 */
function shouldSkipCategory(name: string): boolean {
  const lower = name.toLowerCase().trim()

  // Empty or very short names (e.g., "CS", "DS", "ES", "FS", "OS", "RS")
  if (lower.length <= 2) return true

  // Exact matches to meta-section headers
  if (SKIP_CATEGORIES.has(lower)) return true

  // "What is X?" pattern
  if (lower.startsWith('what is')) return true

  return false
}

const CATEGORY_LOOKUP: Record<string, string[]> = {
  'Machine Learning': [
    'ai',
    'ml',
    'machine learning',
    'artificial intelligence',
    'deep learning',
    'general-purpose machine learning',
    'ai and machine learning',
    'ai / machine learning / data sciences',
    'ai/machine learning',
    'automated machine learning',
    'strong machine learning',
    'online machine learning',
    'graph machine learning',
    'machine learning resources',
    'neural networks',
    'ai tools',
    'ai frameworks',
    'tensorflow',
    'pytorch',
    'scikit-learn',
    'keras',
    'huggingface',
  ],
  LLMs: [
    'llm',
    'llms',
    'large language models',
    'language models',
    'openai',
    'chatgpt',
    'generative ai',
    'knowledge & memory',
  ],
  'AI Agents': ['ai agents', 'coding agents', 'agents'],
  NLP: [
    'natural language processing',
    'nlp',
    'text analysis',
    'text mining',
    'sentiment analysis',
  ],
  'Computer Vision': [
    'computer vision',
    'image recognition',
    'object detection',
    'ocr',
  ],
  APIs: [
    'api',
    'apis',
    'rest api',
    'rest apis',
    'api wrapper',
    'api wrappers',
    'api clients',
    'third-party apis',
    'api development',
    'api tools',
    'software development - api management',
  ],
  GraphQL: ['graphql'],
  gRPC: ['grpc'],
  Authentication: [
    'auth',
    'authentication',
    'authentication & identities',
    'authentication & security',
    'authentication and authorization',
    'authentication and oauths',
    'multi-factor auth',
    'password-based auth',
    'authorization',
    'oauth',
    'jwt',
    'passport',
    'session',
    'sessions',
    'social login',
    'single sign-on',
    'sso',
  ],
  Automation: [
    'automation',
    'browser automation',
    'workflow automation',
    'task automation',
    'home automation',
    'process automation',
  ],
  'Web Scraping': ['scrapers', 'scraping', 'web scraping', 'crawlers'],
  Backend: ['backend', 'back-end', 'server', 'server-side'],
  Blockchain: [
    'blockchain',
    'crypto',
    'cryptocurrency',
    'web3',
    'ethereum',
    'bitcoin',
    'nft',
    'nfts',
    'solidity',
    'smart contracts',
    'defi',
  ],
  'Build Tools': [
    'bundler',
    'bundlers',
    'build tool',
    'build tools',
    'build systems',
    'compiler',
    'compilers',
    'transpiler',
    'transpilers',
    'webpack',
    'vite',
    'esbuild',
    'rollup',
    'task runners',
  ],
  Caching: ['caching', 'cache', 'redis', 'memcached'],
  'Data Visualization': [
    'charts',
    'chart',
    'data visualization',
    'data analysis / data visualization',
    'visualization',
    'visualizations',
    'plotting tools',
    'dashboards',
  ],
  'CI/CD': [
    'ci/cd',
    'cicd',
    'continuous integration',
    'continuous deployment',
    'software development - continuous integration & continuous deployment',
  ],
  'CLI Tools': [
    'cli',
    'cli tools',
    'cli applications',
    'cli utilities',
    'cli utils',
    'cli libraries',
    'command line',
    'command line tools',
    'command line applications',
    'command-line',
    'command-line apps',
    'command-line utilities',
    'command-line interface development',
    'command-line tools',
    'terminal tools',
    'terminal',
    'shell',
    'shell tools',
  ],
  Cloud: [
    'cloud',
    'cloud platforms',
    'cloud computing',
    'cloud services',
    'aws',
    'azure',
    'gcp',
    'google cloud',
  ],
  Serverless: [
    'serverless',
    'serverless functions',
    'edge functions',
    'cloud functions',
    'lambda',
  ],
  CMS: [
    'cms',
    'headless cms',
    'content management',
    'content management systems',
    'content management system',
  ],
  'Code Quality': [
    'linter',
    'linters',
    'linting',
    'code quality',
    'code analysis',
    'static analysis',
    'code review',
    'code style',
    'coding conventions',
    'formatting',
  ],
  Communication: [
    'communication',
    'communication - custom communication systems',
    'communication - social networks and forums',
    'chat',
    'messaging',
    'real-time communication',
  ],
  Email: [
    'communication - email',
    'email',
    'email tools',
    'smtp',
    'email clients',
    'mailing',
  ],
  Compression: ['compression', 'archiving', 'compression and archiving', 'zip'],
  Configuration: [
    'configuration',
    'configurations',
    'configuration files',
    'config managers',
    'configuration & discoveries',
    'configuration tunings',
    'environment variables',
    'env management',
    'dotfiles',
  ],
  Containers: [
    'containers',
    'docker',
    'dockers',
    'dockerfiles',
    'docker images',
    'container compositions',
    'general containers',
    'kubernetes',
    'k8s',
  ],
  CSS: [
    'css',
    'styling',
    'stylesheet',
    'stylesheets',
    'css-in-js',
    'sass',
    'less',
    'postcss',
  ],
  'Tailwind CSS': ['tailwind', 'tailwind css', 'tailwindcss'],
  'Data Processing': [
    'data',
    'data processing',
    'data pipelines',
    'data transformation',
    'data manipulation',
    'etl',
    'data engineering',
  ],
  'Data Science': [
    'data science',
    'data sciences',
    'data analysis',
    'analytics',
    'statistics',
  ],
  Databases: [
    'database',
    'databases',
    'database tools',
    'database management',
    'database clients',
    'database drivers',
    'database drivers/clients',
    'multi databases',
    'databases & orms',
    'databases & spreadsheets',
    'sql',
    'nosql',
    'postgresql',
    'postgres',
    'mysql',
    'sqlite',
    'mongodb',
  ],
  ORMs: ['orm', 'orms', 'orm and datamapping'],
  'Date & Time': [
    'date',
    'time',
    'datetime',
    'date & time',
    'date and time',
    'calendar',
    'calendars',
  ],
  Scheduling: [
    'scheduler',
    'scheduling',
    'job scheduling',
    'task scheduling',
    'cron jobs',
  ],
  Debugging: [
    'debugging',
    'debugger',
    'debuggers',
    'debugging tools',
    'profiling',
    'profiler',
    'tracing',
  ],
  Deployment: [
    'deployment',
    'deployment tools',
    'deployment & environments',
    'deployment / distribution',
    'deployment and infrastructure',
    'hosting',
    'continuous delivery',
  ],
  Design: ['design', 'design tools', 'design resources', 'figma', 'sketch'],
  'Design Systems': ['design system', 'design systems'],
  Desktop: ['desktop', 'desktop apps', 'desktop applications'],
  Electron: ['electron'],
  Tauri: ['tauri'],
  'Developer Tools': [
    'tool',
    'tools',
    'developer tool',
    'developer tools',
    'devtools',
    'system tools',
    'development',
    'development tools',
    'development environment',
    'other tools and integrations',
    'dev tools',
    'tooling',
    'productivity tools',
    'software development - ide & tools',
  ],
  DevOps: [
    'devops',
    'infrastructure as code',
    'terraform',
    'ansible',
    'puppet',
    'chef',
  ],
  Documentation: [
    'documentation',
    'docs',
    'doc',
    'documentations',
    'documentation tools',
    'documentation helpers',
    'documentation & changelogs',
    'documentation & examples',
    'documentation and guides',
    'api documentation',
    'code documentation',
  ],
  'E-commerce': [
    'ecommerce',
    'e-commerce',
    'e commerce',
    'online stores',
    'shopping cart',
  ],
  Editors: ['ide', 'ides', 'editor', 'editors'],
  'VS Code': ['vscode', 'vs code', 'visual studio code', 'vscode extensions'],
  Neovim: ['neovim'],
  Vim: ['vim'],
  Emacs: ['emacs'],
  'Editor Plugins': ['editing support'],
  Cryptography: [
    'encryption',
    'cryptography',
    'security and cryptography',
    'hashing',
    'crypto libraries',
  ],
  Extensions: ['extension', 'extensions', 'addons'],
  Plugins: ['plugin', 'plugins'],
  'Browser Extensions': ['browser extensions'],
  'File Management': [
    'file',
    'files',
    'file handling',
    'file management',
    'file system',
    'filesystem',
    'upload',
    'file upload',
    'file transfer',
    'file transfer - single-click & drag-n-drop upload',
    'file transfer - web-based file managers',
  ],
  Finance: [
    'finance',
    'fintech',
    'finance & fintech',
    'money, budgeting & management',
  ],
  Payments: ['payment', 'payments', 'stripe', 'billing', 'invoicing'],
  Forms: ['form', 'forms', 'form handling', 'form validation', 'form builder'],
  Frontend: [
    'frontend',
    'front-end',
    'frontend development',
    'software development - fec',
  ],
  'Frontend Frameworks': ['frontend framework', 'frontend frameworks'],
  'Web Frameworks': ['web-framework', 'web frameworks', 'web framework'],
  Games: [
    'game',
    'games',
    'gaming',
    'game development',
    'game engine',
    'game engines',
    'gamedev',
    'arcade',
    'strategy',
    'fps',
    'rpg',
    'puzzle',
    'godot 4',
    'godot 3',
    'unity',
    'unreal',
  ],
  Git: ['git', 'git tools', 'version control', 'gitlab'],
  GitHub: ['github', 'github actions'],
  'Graphics & Images': [
    'image',
    'images',
    'img',
    'image processing',
    'graphics',
    'image manipulation',
    'svg',
    'canvas',
    'webgl',
    '3d',
    'three.js',
  ],
  HTTP: [
    'http',
    'http clients',
    'http client',
    'http servers',
    'http server',
    'axios',
    'request',
    'fetch',
  ],
  Internationalization: [
    'i18n',
    'internationalization',
    'localization',
    'l10n',
    'translation',
    'translations',
    'multi-language',
    'software development - localization',
  ],
  IoT: ['iot', 'internet of things', 'arduino', 'raspberry pi'],
  'Embedded Systems': ['embedded', 'embedded systems'],
  Serialization: [
    'json',
    'yaml',
    'xml',
    'toml',
    'serialization',
    'deserialization',
    'data formats',
  ],
  'Logging & Monitoring': [
    'logging',
    'logger',
    'monitoring',
    'observability',
    'application performance monitoring',
    'apm',
    'metrics',
    'alerting',
  ],
  'Maps & Geolocation': [
    'maps',
    'mapping',
    'geolocation',
    'gis',
    'geocoding',
    'geospatial data',
    'maps & gps',
    'gps',
    'navigation',
  ],
  Math: [
    'math',
    'mathematics',
    'numerical computation',
    'scientific computing',
  ],
  Media: [
    'media',
    'video',
    'audio',
    'media streaming',
    'media streaming - audio streaming',
    'media streaming - video streaming',
    'streaming',
    'video processing',
    'audio processing',
    'ffmpeg',
    'podcast',
    'music',
    'photo management',
    'photos',
    'gallery',
  ],
  'Message Queues': [
    'message queue',
    'message queues',
    'event-driven',
    'rabbitmq',
    'kafka',
    'pub/sub',
  ],
  Miscellaneous: [
    'miscellaneous',
    'misc',
    'other',
    'others',
    'general',
    'mixed utilities',
    'uncategorized',
  ],
  Mobile: [
    'mobile',
    'mobile development',
    'mobile apps',
    'capgo capacitor plugins',
  ],
  iOS: ['ios', 'swift'],
  Android: ['android', 'kotlin'],
  'React Native': ['react native', 'react-native'],
  Flutter: ['flutter'],
  Networking: [
    'networking',
    'network',
    'network programming',
    'network utilities',
    'network protocols',
    'networking and communication middleware',
    'dns',
    'tcp',
    'udp',
    'proxy',
    'vpn',
    'dns tools',
    'domain management',
  ],
  WebSockets: ['websocket', 'websockets', 'web sockets'],
  'Node.js': ['node', 'nodejs', 'node.js'],
  Deno: ['deno'],
  Bun: ['bun'],
  Notifications: [
    'notification',
    'notifications',
    'toast',
    'push notifications',
    'alerts',
  ],
  'Package Management': [
    'package manager',
    'package managers',
    'npm',
    'dependency management',
  ],
  Parsers: ['parser', 'parsers', 'parsing'],
  'Text Processing': [
    'text processing',
    'text and numbers',
    'string manipulation',
    'regex',
    'regular expressions',
  ],
  Markdown: ['markdown', 'markdown processors'],
  Performance: [
    'performance',
    'optimization',
    'performance optimization',
    'benchmarking',
    'benchmark',
    'load testing',
  ],
  Productivity: ['productivity', 'workplace & productivity', 'note-taking'],
  'Project Management': [
    'project management',
    'software development - project management',
  ],
  React: ['react', 'react components', 'react hooks', 'gatsby', 'remix'],
  'Next.js': ['next', 'nextjs', 'next.js'],
  Robotics: ['robotics', 'ros', 'robot operating system'],
  Search: [
    'search',
    'search engine',
    'search engines',
    'search & data extraction',
    'elasticsearch',
    'full-text search',
  ],
  Security: [
    'security',
    'security tools',
    'security auditing services',
    'tools - security',
    'penetration testing',
    'vulnerability scanning',
    'firewall',
    'web security',
  ],
  'Self-Hosted': ['self-hosted', 'selfhosted', 'self hosted'],
  'State Management': [
    'state management',
    'state',
    'store',
    'redux',
    'zustand',
    'mobx',
  ],
  Storage: ['storage', 'object storage', 's3 compatible', 'blob storage'],
  Templates: [
    'boilerplate',
    'boilerplates',
    'template',
    'templates',
    'starter',
    'starters',
    'scaffold',
    'scaffolding',
    'starter kits',
    'project templates',
  ],
  Testing: [
    'testing',
    'test',
    'tests',
    'testing framework',
    'testing frameworks',
    'test runner',
    'test runners',
    'unit testing',
    'integration testing',
    'end-to-end testing',
    'e2e',
    'test automation',
    'mocking',
    'code coverage',
  ],
  Typography: ['typography', 'fonts', 'font', 'web fonts'],
  'UI Components': [
    'ui',
    'gui',
    'ui libraries',
    'ui components',
    'ui framework',
    'ui frameworks',
    'components',
    'component library',
    'component libraries',
    'widgets',
    'table',
    'tables',
    'grid',
    'grids',
    'modal',
    'modals',
    'dialog',
    'dialogs',
  ],
  Icons: ['icons', 'icon', 'icon sets'],
  Animation: ['animation', 'animations', 'transition', 'transitions', 'motion'],
  Utilities: [
    'utility',
    'utilities',
    'utils',
    'helper',
    'helpers',
    'utility libraries',
    'utility functions',
  ],
  Libraries: [
    'lib',
    'library',
    'libraries',
    'frameworks',
    'new libraries',
    'framework components',
    'frameworks/engines/libraries',
  ],
  Validation: ['validation', 'schema validation', 'input validation'],
  Vue: ['vue', 'vue.js', 'vuejs'],
  Nuxt: ['nuxt', 'nuxtjs', 'nuxt.js'],
  'Web Applications': [
    'web applications',
    'web apps',
    'open source rails apps',
    'web services',
  ],
  Angular: ['angular'],
  Svelte: ['svelte'],
  SvelteKit: ['sveltekit'],
  SolidJS: ['solid', 'solidjs'],
  Qwik: ['qwik'],
  Express: ['express'],
  Koa: ['koa'],
  Fastify: ['fastify'],
  NestJS: ['nest', 'nestjs'],
  Django: ['django'],
  Flask: ['flask'],
  Rails: ['rails'],
  Laravel: ['laravel'],
  'Spring Boot': ['spring boot'],
  Generators: ['generator', 'generators', 'code generation', 'code generators'],
  Middleware: ['middleware'],
  Adapters: ['adapter', 'adapters'],
  Wrappers: ['wrapper', 'wrappers'],
  SDKs: ['sdk', 'sdks'],
  Algorithms: [
    'algorithms',
    'algorithms and data structures',
    'data structures',
    'sorting',
  ],
  Accessibility: ['accessibility', 'a11y'],
  SEO: ['seo', 'search engine optimization'],
  PDF: ['pdf', 'pdf generation', 'pdf tools'],
  WebAssembly: ['wasm', 'webassembly'],
  Concurrency: [
    'concurrency',
    'async programming',
    'asynchronous programming',
    'parallelism',
    'multithreading',
  ],
  'Error Handling': [
    'error handling',
    'error tracking',
    'exception handling',
    'error reporting',
  ],
  'Feature Flags': ['feature flags', 'feature toggles'],
  Formatters: ['formatter', 'formatters', 'prettier'],
  'Drag & Drop': ['drag and drop', 'drag & drop', 'dnd'],
  Routing: ['routing', 'router', 'routers'],
  Privacy: ['privacy', 'gdpr', 'data privacy'],
  Spreadsheets: ['spreadsheet', 'spreadsheets', 'excel', 'csv'],
  WebRTC: ['webrtc', 'video conferencing'],
  Color: ['color', 'colors', 'color picker', 'color manipulation'],
  Theming: ['theming', 'themes', 'dark mode'],
  'Rate Limiting': ['rate limiting', 'throttling'],
  Workflow: ['workflow', 'workflows', 'pipelines'],
  MCP: [
    'mcp',
    'mcp servers',
    'mcp tools',
    'mcp clients',
    'model context protocol',
  ],
  RSS: ['rss', 'rss readers', 'feeds', 'feed readers'],
  Education: [
    'education',
    'learning',
    'tutorials',
    'courses',
    'learning resources',
    'e-learning',
  ],
  Health: ['health', 'fitness', 'health and fitness'],
  Backup: ['backup', 'backups', 'backup tools'],
  'Knowledge Management': [
    'wiki',
    'wikis',
    'knowledge base',
    'knowledge management',
  ],
  'URL Tools': ['url', 'url shortener', 'url shorteners', 'link shortener'],
  Pastebins: ['pastebin', 'pastebins'],
  Analytics: ['web analytics', 'analytics tools'],
  Bookmarks: ['bookmarks', 'bookmark managers'],
  'Status Pages': ['status pages', 'uptime monitoring'],
  'Document Management': [
    'document management',
    'document management - e-books',
    'document management - institutional repository',
  ],
  Ticketing: [
    'ticketing',
    'ticketing systems',
    'issue tracking',
    'bug tracking',
  ],
  Polls: ['polls', 'polls and events', 'surveys'],
  'Inventory Management': ['inventory', 'inventory management'],
  'Recipe Management': ['recipe management', 'recipes'],
  'Calendar & Contacts': [
    'calendar & contacts',
    'calendar/contacts',
    'contacts',
    'address book',
  ],
  Groupware: ['groupware'],
  Collaboration: ['collaboration', 'team collaboration'],
  'Resource Planning': ['resource planning'],
  'Low Code': [
    'software development - low code',
    'low code',
    'no-code',
    'low-code',
  ],
}

const CATEGORY_MAPPINGS = Object.entries(CATEGORY_LOOKUP).reduce<
  Record<string, string>
>((acc, [value, keys]) => {
  for (const key of keys) {
    acc[key] = value
  }
  return acc
}, {})

/**
 * Get all categories from database
 */
export async function getAllCategories(db: D1Database): Promise<
  {
    id: number
    name: string
    slug: string
  }[]
> {
  const results = await db
    .prepare('SELECT id, name, slug FROM categories ORDER BY name')
    .all<{ id: number; name: string; slug: string }>()

  return results.results
}

/**
 * Get category by ID
 */
export async function getCategoryById(
  db: D1Database,
  id: number,
): Promise<null | {
  id: number
  name: string
  slug: string
}> {
  const result = await db
    .prepare('SELECT id, name, slug FROM categories WHERE id = ?')
    .bind(id)
    .first<{ id: number; name: string; slug: string }>()

  return result
}

/**
 * Get category by slug
 */
export async function getCategoryBySlug(
  db: D1Database,
  slug: string,
): Promise<null | {
  id: number
  name: string
  slug: string
}> {
  const result = await db
    .prepare('SELECT id, name, slug FROM categories WHERE slug = ?')
    .bind(slug)
    .first<{ id: number; name: string; slug: string }>()

  return result
}

// ============================================================================
// Database Category Functions
// ============================================================================

/**
 * Get or create a category by its normalized name
 */
export async function getOrCreateCategory(
  db: D1Database,
  name: string,
): Promise<null | number> {
  const normalized = normalizeCategoryName(name)
  if (!normalized) return null
  const { name: normalizedName, slug } = normalized

  const existing = await db
    .prepare('SELECT id FROM categories WHERE slug = ?')
    .bind(slug)
    .first<{ id: number }>()

  if (existing) {
    return existing.id
  }

  const result = await db
    .prepare('INSERT INTO categories (slug, name) VALUES (?, ?)')
    .bind(slug, normalizedName)
    .run()

  return result.meta.last_row_id
}

/**
 * Clean and normalize a category name.
 * Returns null if the category should be skipped (noise section headers, etc.)
 */
export function normalizeCategoryName(raw: string): NormalizedCategory | null {
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

  // Stage 5: Check if this category should be skipped entirely
  if (shouldSkipCategory(cleaned)) {
    return null
  }

  // Stage 6: Apply mappings (exact match, then pattern-based)
  const { mapped: wasMapped, result: mappedResult } = applyMappings(cleaned)
  cleaned = mappedResult

  // Stage 7: Clean up extra whitespace
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9\s/&.+-]/g, '')
    .trim()

  // If empty after cleanup, skip
  if (!cleaned) return null

  // If a direct mapping was found, trust its casing — skip title case and pluralize
  if (wasMapped) {
    const slug = generateSlug(cleaned)
    return { name: cleaned, slug }
  }

  // Stage 8: Title case for display name
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

  // Stage 9: Pluralize for consistency
  const name = pluralize(titleCased)

  // Stage 10: Generate slug
  const slug = generateSlug(name)

  return {
    name,
    slug,
  }
}

/**
 * Apply category mappings to normalize to canonical form.
 * Tries exact match first, then pattern-based fallbacks.
 */
function applyMappings(name: string): { mapped: boolean; result: string } {
  const lower = name.toLowerCase().trim()

  // 1. Exact match
  if (CATEGORY_MAPPINGS[lower]) {
    return { mapped: true, result: CATEGORY_MAPPINGS[lower] }
  }

  // 2. Pattern-based fallbacks

  // "deployment tools for *" → Deployment
  if (lower.startsWith('deployment tools for ')) {
    return { mapped: true, result: 'Deployment' }
  }

  // "document management - *" → Document Management
  if (
    lower.startsWith('document management -') ||
    lower.startsWith('document management -')
  ) {
    return { mapped: true, result: 'Document Management' }
  }

  // "file transfer - *" → File Management
  if (
    lower.startsWith('file transfer -') ||
    lower.startsWith('file transfer -')
  ) {
    return { mapped: true, result: 'File Management' }
  }

  // "communication - *" → Communication
  if (
    lower.startsWith('communication -') ||
    lower.startsWith('communication -')
  ) {
    return { mapped: true, result: 'Communication' }
  }

  // "media streaming - *" → Media
  if (
    lower.startsWith('media streaming -') ||
    lower.startsWith('media streaming')
  ) {
    return { mapped: true, result: 'Media' }
  }

  // "software development - *" → try mapping the suffix
  if (lower.startsWith('software development -')) {
    const suffix = lower.replace('software development -', '').trim()
    if (CATEGORY_MAPPINGS[suffix]) {
      return { mapped: true, result: CATEGORY_MAPPINGS[suffix] }
    }
    return { mapped: true, result: 'Developer Tools' }
  }

  // "* tools" → try mapping the prefix word as a category
  const toolsMatch = /^(.+?)\s+tools?$/.exec(lower)
  if (toolsMatch) {
    const prefix = toolsMatch[1]
    if (CATEGORY_MAPPINGS[prefix]) {
      return { mapped: true, result: CATEGORY_MAPPINGS[prefix] }
    }
  }

  // "* libraries" or "* library" → try mapping the prefix
  const libMatch = /^(.+?)\s+librar(?:y|ies)$/.exec(lower)
  if (libMatch) {
    const prefix = libMatch[1]
    if (CATEGORY_MAPPINGS[prefix]) {
      return { mapped: true, result: CATEGORY_MAPPINGS[prefix] }
    }
  }

  // "* utilities" or "* utils" → try mapping the prefix
  const utilMatch = /^(.+?)\s+(?:utilities|utils)$/.exec(lower)
  if (utilMatch) {
    const prefix = utilMatch[1]
    if (CATEGORY_MAPPINGS[prefix]) {
      return { mapped: true, result: CATEGORY_MAPPINGS[prefix] }
    }
  }

  // "* and *" compound categories → try mapping first part
  const andMatch = /^(.+?)\s+(?:and|&)\s+(.+)$/.exec(lower)
  if (andMatch) {
    const first = andMatch[1].trim()
    if (CATEGORY_MAPPINGS[first]) {
      return { mapped: true, result: CATEGORY_MAPPINGS[first] }
    }
    const second = andMatch[2].trim()
    if (CATEGORY_MAPPINGS[second]) {
      return { mapped: true, result: CATEGORY_MAPPINGS[second] }
    }
  }

  return { mapped: false, result: name }
}
