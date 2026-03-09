/**
 * MCP Request Handler
 * Handles HTTP requests for the /mcp endpoint
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { env } from 'cloudflare:workers'
import { z } from 'zod'

import { createKysely } from '../db/client'
import { ftsSearch } from '../db/repositories/fts-search-repository'
import {
  getRegistryDetail,
  getRegistryMetadata,
} from '../db/repositories/registry-repository'
import { getRepoDetail } from '../db/repositories/repository-repository'
import { getFilterOptions } from '../db/repositories/search-repository'

// Tool input schemas
const SearchSchema = z.object({
  query: z
    .string()
    .describe(
      'Natural language search query (e.g., "java serialization library")',
    ),
  registry: z
    .string()
    .optional()
    .describe('Filter to specific registry (e.g., "java", "python", "react")'),
  category: z
    .string()
    .optional()
    .describe(
      'Filter to specific category (e.g., "Serialization", "HTTP Clients")',
    ),
  tag: z.string().optional().describe('Filter to specific tag'),
  language: z.string().optional().describe('Filter by programming language'),
  minStars: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Minimum number of GitHub stars'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe('Maximum results to return (default: 20)'),
  cursor: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Pagination cursor for next page'),
})

const GetRepositoryDetailsSchema = z.object({
  owner: z.string().describe('Repository owner/organization name'),
  name: z.string().describe('Repository name'),
})

const BrowseRegistriesSchema = z.object({
  registryName: z
    .string()
    .optional()
    .describe('Specific registry name to get details for (optional)'),
})

const GetFilterOptionsSchema = z.object({
  registryName: z
    .string()
    .optional()
    .describe('Scope filters to a specific registry'),
  language: z
    .string()
    .optional()
    .describe('Scope filters to a specific language'),
  category: z
    .string()
    .optional()
    .describe('Scope filters to a specific category'),
  tag: z.string().optional().describe('Scope filters to a specific tag'),
})

/**
 * Handle MCP HTTP requests
 * Creates a stateless server instance and processes the request
 */
export async function handleMcpRequest(request: Request): Promise<Response> {
  try {
    // Create a new server instance for each request (stateless mode)
    const server = createMcpServerWithDb()

    // Create transport with no session (stateless mode)
    const transport = new WebStandardStreamableHTTPServerTransport(
      undefined, // sessionIdGenerator: undefined = stateless
    )

    // Connect server to transport
    await server.connect(transport)

    // Handle the request
    const response = await transport.handleRequest(request)

    return response
  } catch (error) {
    console.error('MCP request error:', error)

    // Return JSON-RPC error response
    return Response.json(
      {
        error: {
          code: -32603,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        id: null,
        jsonrpc: '2.0',
      },
      { status: 500 },
    )
  }
}

/**
 * Check if a request is targeting the MCP endpoint
 */
export function isMcpRequest(request: Request): boolean {
  const url = new URL(request.url)
  return url.pathname === '/mcp'
}

/**
 * Create an MCP server instance with tools bound to a database
 */
function createMcpServerWithDb(): McpServer {
  const db = createKysely(env.DB)

  const server = new McpServer(
    {
      name: 'enhansome-registry',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  // Register search tool (FTS5-powered natural language search)
  server.registerTool(
    'search',
    {
      description: `Natural language search for curated repositories.

Works like a search engine - just describe what you need:
- "java serialization library"
- "react state management"
- "python http client"
- "rust web framework"

Returns matching repositories ranked by relevance.
If results are sparse, suggests filters to refine (registry, category).

## Tips for best results
- Use descriptive terms: "json parser" works better than "json"
- Include language/ecosystem: "python testing" or "rust async"
- When suggestions are returned, try the suggested filters for better results`,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
      inputSchema: SearchSchema,
    },
    async params => {
      try {
        if (!params.query.trim()) {
          return {
            content: [
              {
                text: JSON.stringify({ error: 'Query is required' }),
                type: 'text',
              },
            ],
            isError: true,
          }
        }

        const result = await ftsSearch(db, {
          query: params.query,
          registry: params.registry,
          category: params.category,
          tag: params.tag,
          language: params.language,
          minStars: params.minStars,
          limit: params.limit ?? 20,
          cursor: params.cursor,
        })

        // Format response for AI consumption
        const response = {
          repositories: result.repositories.map(r => ({
            owner: r.repo_info.owner,
            name: r.repo_info.repo,
            description: r.description,
            stars: r.repo_info.stars,
            language: r.repo_info.language,
            registries: r.registries,
            categories: r.categories,
            tags: r.tags,
            qualityScore: Math.round(r.qualityScore * 100) / 100,
          })),
          suggestions: result.suggestions,
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
          total: result.total,
        }

        return {
          content: [{ text: JSON.stringify(response, null, 2), type: 'text' }],
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [{ text: JSON.stringify({ error: message }), type: 'text' }],
          isError: true,
        }
      }
    },
  )

  // Register get_repository_details tool
  server.registerTool(
    'get_repository_details',
    {
      description: `Get detailed information about a specific repository.

Returns complete repository metadata including:
- Description, language, stars, last commit date
- Categories and tags
- All registries it appears in
- Related repositories from the same registry

Requires the repository owner and name (e.g., "facebook" and "react").`,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
      inputSchema: GetRepositoryDetailsSchema,
    },
    async params => {
      try {
        const result = await getRepoDetail(db, params.owner, params.name)
        if (!result) {
          return {
            content: [
              {
                text: JSON.stringify({ error: 'Repository not found' }),
                type: 'text',
              },
            ],
            isError: true,
          }
        }
        return {
          content: [{ text: JSON.stringify(result, null, 2), type: 'text' }],
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [{ text: JSON.stringify({ error: message }), type: 'text' }],
          isError: true,
        }
      }
    },
  )

  // Register browse_registries tool
  server.registerTool(
    'browse_registries',
    {
      description: `Browse available awesome list registries.

Without parameters, returns a list of all available registries with metadata.
With registryName parameter, returns detailed information about a specific registry including:
- Title, description, source repository
- Categories, languages, and tags available
- Top repositories by stars
- Total items and aggregate stars

Use this to discover what curated lists are available or get details about a specific one.`,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
      inputSchema: BrowseRegistriesSchema,
    },
    async params => {
      try {
        if (params.registryName) {
          const detail = await getRegistryDetail(db, params.registryName)
          if (!detail) {
            return {
              content: [
                {
                  text: JSON.stringify({ error: 'Registry not found' }),
                  type: 'text',
                },
              ],
              isError: true,
            }
          }
          return {
            content: [
              {
                text: JSON.stringify({ registry: detail }, null, 2),
                type: 'text',
              },
            ],
          }
        }
        const registries = await getRegistryMetadata(db)
        return {
          content: [
            { text: JSON.stringify({ registries }, null, 2), type: 'text' },
          ],
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [{ text: JSON.stringify({ error: message }), type: 'text' }],
          isError: true,
        }
      }
    },
  )

  // Register get_filter_options tool
  server.registerTool(
    'get_filter_options',
    {
      description: `Get available filter options for building search queries.

Returns counts of repositories for each filter value:
- Categories: Topics like "UI Components", "State Management", etc.
- Languages: Programming languages like "TypeScript", "Python", etc.
- Registries: Available awesome lists like "awesome-react", "awesome-python", etc.
- Tags: Topic tags for repositories

Can be scoped to a specific registry, language, category, or tag to see
cross-filtered counts. Use this to help users discover filtering options.`,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
      inputSchema: GetFilterOptionsSchema,
    },
    async params => {
      try {
        const result = await getFilterOptions(db, {
          categoryName: params.category,
          language: params.language,
          registryName: params.registryName,
          tagName: params.tag,
        })
        return {
          content: [{ text: JSON.stringify(result, null, 2), type: 'text' }],
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          content: [{ text: JSON.stringify({ error: message }), type: 'text' }],
          isError: true,
        }
      }
    },
  )

  return server
}
