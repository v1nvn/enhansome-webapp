import { TanStackDevtools } from '@tanstack/react-devtools'
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

import Header from '../components/Header'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    links: [
      {
        href: appCss,
        rel: 'stylesheet',
      },
      {
        href: '/manifest.json',
        rel: 'manifest',
      },
      {
        href: '/favicon.svg',
        rel: 'icon',
        type: 'image/svg+xml',
      },
      {
        href: '/favicon.ico',
        rel: 'alternate icon',
        type: 'image/x-icon',
        sizes: '64x64 32x32 24x24 16x16',
      },
      {
        href: '/apple-touch-icon.png',
        rel: 'apple-touch-icon',
        sizes: '180x180',
      },
      // Favicon sizes for better browser support
      {
        href: '/favicon-16x16.png',
        rel: 'icon',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        href: '/favicon-32x32.png',
        rel: 'icon',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        name: 'viewport',
      },
      {
        content: 'light dark',
        name: 'color-scheme',
      },
      {
        content: '#e88a5a',
        name: 'theme-color',
      },
      {
        content: '#e88a5a',
        name: 'msapplication-TileColor',
      },
      {
        content: '/browserconfig.xml',
        name: 'msapplication-config',
      },
      // Primary SEO Meta Tags
      {
        title: 'Enhansome - Curated Developer Resources Registry',
      },
      {
        content:
          'Discover exceptional developer tools, libraries, and frameworks from curated awesome lists with enhanced metadata, powerful search, intelligent filtering, and comprehensive categorization. Find the best repositories for your next project.',
        name: 'description',
      },
      {
        content:
          'developer tools, open source, awesome lists, github repositories, software libraries, frameworks, developer resources, curated tools',
        name: 'keywords',
      },
      {
        content: 'Enhansome',
        name: 'application-name',
      },
      {
        content: 'Enhansome',
        property: 'og:site_name',
      },
      // Open Graph / Facebook
      {
        content: 'website',
        property: 'og:type',
      },
      {
        content: 'Enhansome - Curated Developer Resources Registry',
        property: 'og:title',
      },
      {
        content:
          'Discover exceptional developer tools, libraries, and frameworks from curated awesome lists with enhanced metadata, powerful search, and intelligent filtering.',
        property: 'og:description',
      },
      {
        content: '/og-image.png',
        property: 'og:image',
      },
      {
        content: 'https://enhansome.com',
        property: 'og:url',
      },
      // Twitter Card
      {
        content: 'summary_large_image',
        name: 'twitter:card',
      },
      {
        content: 'Enhansome - Curated Developer Resources Registry',
        name: 'twitter:title',
      },
      {
        content:
          'Discover exceptional developer tools, libraries, and frameworks from curated awesome lists with enhanced metadata, powerful search, and intelligent filtering.',
        name: 'twitter:description',
      },
      {
        content: '/twitter-image.png',
        name: 'twitter:image',
      },
      // LLM / AI-friendly structured data
      {
        content:
          'Enhansome is a curated registry of developer resources, tools, libraries, and frameworks sourced from high-quality awesome lists. It provides enhanced metadata including GitHub stars, last commit dates, programming languages, categories, and powerful search capabilities with intelligent filtering by registry, category, stars, dates, and project status.',
        name: 'ai-summary',
      },
      {
        content:
          'developer resources, software engineering, open source discovery, github, awesome lists, registry, searchable database',
        name: 'ai-topics',
      },
      {
        content:
          'technology, programming, software-development, developer-tools, open-source',
        name: 'ai-categories',
      },
      // Additional SEO
      {
        content: 'index, follow',
        name: 'robots',
      },
      {
        content: 'Enhansome Team',
        name: 'author',
      },
      {
        content: 'Copyright © 2025 Enhansome. All rights reserved.',
        name: 'copyright',
      },
      // Schema.org structured data for search engines
      {
        content: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Enhansome',
          description:
            'Curated registry of developer tools, libraries, and frameworks with enhanced metadata and intelligent filtering.',
          url: 'https://enhansome.com',
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'Web',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          featureList: [
            'Advanced search functionality',
            'Intelligent filtering',
            'GitHub integration',
            'Multi-registry support',
            'Category browsing',
            'Stars-based sorting',
            'Activity tracking',
          ],
        }),
        name: 'schema-markup',
        type: 'application/ld+json',
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <Header />
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
