/**
 * Use Case Categories for Discovery
 *
 * These are curated categories that aggregate items across all registries
 * based on their purpose/use case rather than registry-specific boundaries.
 */

export interface UseCaseCategory {
  count?: number // Total items across registries
  description: string
  icon: string // 'bar-chart'
  id: string // 'charts-visualization'
  keywords: string[] // For matching items to categories
  subcategories?: {
    count: number
    id: string
    title: string
  }[]
  title: string // 'Charts & Visualization'
}

export interface UseCaseCategoryWithCount {
  count: number // Total items across registries
  description: string
  icon: string
  id: string
  title: string
}

// Predefined use case categories with keyword matching
const USE_CASE_CATEGORIES: Omit<UseCaseCategory, 'subcategories'>[] = [
  {
    id: 'charts-visualization',
    title: 'Charts & Visualization',
    description:
      'Libraries for rendering charts, graphs, and data visualizations',
    icon: 'bar-chart',
    keywords: [
      'chart',
      'graph',
      'visualization',
      'plot',
      'diagram',
      'd3',
      'recharts',
      'chartjs',
      'nivo',
      'vis',
      'plotly',
      'highcharts',
      'echarts',
      'victory',
      'observable',
    ],
  },
  {
    id: 'state-management',
    title: 'State Management',
    description: 'Tools for managing application state and data flow',
    icon: 'database',
    keywords: [
      'state',
      'store',
      'redux',
      'mobx',
      'zustand',
      'recoil',
      'jotai',
      'valtio',
      'flux',
      'vuex',
      'pinia',
      'effector',
      'signal',
      'react-query',
      'swr',
    ],
  },
  {
    id: 'api-clients',
    title: 'API Clients',
    description: 'HTTP clients, API wrappers, and data fetching libraries',
    icon: 'globe',
    keywords: [
      'api',
      'http',
      'fetch',
      'axios',
      'ky',
      'got',
      'superagent',
      'request',
      'graphql',
      'gql',
      'rest',
      'openapi',
      'swagger',
      'grpc',
      'soap',
    ],
  },
  {
    id: 'testing',
    title: 'Testing',
    description: 'Testing frameworks, assertion libraries, and test utilities',
    icon: 'flask-conical',
    keywords: [
      'test',
      'testing',
      'jest',
      'vitest',
      'mocha',
      'jasmine',
      'karma',
      'chai',
      'assert',
      'cypress',
      'playwright',
      'selenium',
      'puppeteer',
      'msw',
      'testing-library',
      'mock',
      'stub',
      'spy',
    ],
  },
  {
    id: 'ui-components',
    title: 'UI Components',
    description: 'Component libraries and UI toolkits',
    icon: 'layout',
    keywords: [
      'component',
      'ui kit',
      'design system',
      'material',
      'ant',
      'chakra',
      'mantine',
      'shadcn',
      'radix',
      'headless',
      'daisy',
      'tailwind',
      'bootstrap',
      'bulma',
      'element',
      'prime',
      'vuetify',
    ],
  },
  {
    id: 'build-tools',
    title: 'Build Tools',
    description: 'Bundlers, compilers, and development tooling',
    icon: 'wrench',
    keywords: [
      'build',
      'bundle',
      'bundler',
      'webpack',
      'vite',
      'rollup',
      'esbuild',
      'parcel',
      'browserify',
      'babel',
      'swc',
      'turbopack',
      'rspack',
      'compiler',
      'transpiler',
    ],
  },
  {
    id: 'authentication',
    title: 'Authentication',
    description: 'Auth libraries, identity management, and session handling',
    icon: 'lock',
    keywords: [
      'auth',
      'authentication',
      'oauth',
      'jwt',
      'passport',
      'next-auth',
      'clerk',
      'auth0',
      'supabase',
      'firebase',
      'identity',
      'login',
      'session',
      'token',
      'sso',
      'ldap',
    ],
  },
  {
    id: 'mobile-development',
    title: 'Mobile Development',
    description: 'Cross-platform and native mobile development frameworks',
    icon: 'smartphone',
    keywords: [
      'mobile',
      'react native',
      'flutter',
      'ionic',
      'capacitor',
      'cordova',
      'expo',
      'native',
      'android',
      'ios',
      'swift',
      'kotlin',
      'dart',
    ],
  },
  {
    id: 'database',
    title: 'Database & ORM',
    description: 'Database clients, ORMs, and query builders',
    icon: 'database',
    keywords: [
      'database',
      'orm',
      'sql',
      'nosql',
      'prisma',
      'drizzle',
      'typeorm',
      'sequelize',
      'mongoose',
      'knex',
      'qb',
      'query builder',
      'postgres',
      'mysql',
      'mongodb',
      'redis',
      'sqlite',
    ],
  },
  {
    id: 'forms',
    title: 'Forms & Validation',
    description: 'Form handling, validation, and input management',
    icon: 'file-input',
    keywords: [
      'form',
      'validation',
      'react-hook-form',
      'formik',
      'yup',
      'zod',
      'joi',
      'validator',
      'input',
      'field',
      'schema',
    ],
  },
  {
    id: 'date-time',
    title: 'Date & Time',
    description: 'Date manipulation, formatting, and timezone utilities',
    icon: 'calendar',
    keywords: [
      'date',
      'time',
      'moment',
      'date-fns',
      'dayjs',
      'luxon',
      'timezone',
      'calendar',
      'datetime',
      'formatting',
    ],
  },
  {
    id: 'animation',
    title: 'Animation',
    description: 'Animation libraries and motion design tools',
    icon: 'sparkles',
    keywords: [
      'animation',
      'animate',
      'framer',
      'motion',
      'gsap',
      'anime',
      'lottie',
      'react-spring',
      'auto-animate',
      'transition',
      'motion',
    ],
  },
]

/**
 * Map items to use case categories based on keywords
 */
export function categorizeItem(
  title: string,
  description: null | string,
  category: string,
): string[] {
  const searchText = `${title} ${description || ''} ${category}`.toLowerCase()
  const matchedCategories: string[] = []

  for (const useCase of USE_CASE_CATEGORIES) {
    // Check if any keyword matches
    const hasMatch = useCase.keywords.some(keyword =>
      searchText.includes(keyword.toLowerCase()),
    )
    if (hasMatch) {
      matchedCategories.push(useCase.id)
    }
  }

  return matchedCategories
}

/**
 * Get all categories with their display info
 */
export function getAllCategories(): UseCaseCategory[] {
  return USE_CASE_CATEGORIES
}

/**
 * Get category by ID
 */
export function getCategoryById(id: string): undefined | UseCaseCategory {
  return USE_CASE_CATEGORIES.find(cat => cat.id === id)
}
