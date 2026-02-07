import { describe, it, expect } from 'vitest'
import { extractRegistryName, flattenItems } from '@/lib/indexer'
import type { RegistryData } from '@/types/registry'

describe('extractRegistryName', () => {
  it('should extract from owner/repo format', () => {
    expect(extractRegistryName('v1nvn/enhansome-go')).toBe('go')
  })

  it('should extract from repo name with prefix', () => {
    expect(extractRegistryName('enhansome-mcp-servers')).toBe('mcp-servers')
  })

  it('should handle multiple hyphens', () => {
    expect(extractRegistryName('enhansome-free-for-dev')).toBe('free-for-dev')
  })

  it('should return name as-is if no prefix', () => {
    expect(extractRegistryName('selfhosted')).toBe('selfhosted')
  })
})

describe('flattenItems', () => {
  it('should flatten registry data with repo info', () => {
    const data: RegistryData = {
      metadata: {
        title: 'Test Registry',
        source_repository: 'test/repo',
        source_repository_description: 'Test description',
        last_updated: '2025-10-12T00:00:00Z',
      },
      items: [
        {
          title: 'Category 1',
          description: 'First category',
          items: [
            {
              title: 'Item 1',
              description: 'First item',
              children: [],
              repo_info: {
                owner: 'owner1',
                repo: 'repo1',
                stars: 100,
                language: 'TypeScript',
                last_commit: '2025-10-01T00:00:00Z',
                archived: false,
              },
            },
            {
              title: 'Item 2',
              description: null,
              children: [],
              repo_info: {
                owner: 'owner2',
                repo: 'repo2',
                stars: 250,
                language: 'JavaScript',
                last_commit: '2025-10-02T00:00:00Z',
                archived: false,
              },
            },
          ],
        },
        {
          title: 'Category 2',
          description: 'Second category',
          items: [
            {
              title: 'Item 3',
              description: 'Third item',
              children: [],
              repo_info: {
                owner: 'owner3',
                repo: 'repo3',
                stars: 150,
                language: 'Rust',
                last_commit: '2025-10-03T00:00:00Z',
                archived: false,
              },
            },
          ],
        },
      ],
    }

    const result = flattenItems(data)

    expect(result.items).toHaveLength(3)
    expect(result.totalStars).toBe(500)

    expect(result.items[0].category).toBe('Category 1')
    expect(result.items[0].data.title).toBe('Item 1')
    expect(result.items[1].category).toBe('Category 1')
    expect(result.items[1].data.title).toBe('Item 2')
    expect(result.items[2].category).toBe('Category 2')
    expect(result.items[2].data.title).toBe('Item 3')
  })

  it('should handle items without repo info', () => {
    const data: RegistryData = {
      metadata: {
        title: 'Test Registry',
        source_repository: 'test/repo',
        source_repository_description: '',
        last_updated: '2025-10-12T00:00:00Z',
      },
      items: [
        {
          title: 'Resources',
          description: 'External resources',
          items: [
            {
              title: 'Documentation',
              description: 'Official docs',
              children: [],
            },
            {
              title: 'Tutorial',
              description: null,
              children: [],
            },
          ],
        },
      ],
    }

    const result = flattenItems(data)

    expect(result.items).toHaveLength(2)
    expect(result.totalStars).toBe(0)
    expect(result.items[0].data.repo_info).toBeUndefined()
  })

  it('should handle empty items array', () => {
    const data: RegistryData = {
      metadata: {
        title: 'Empty Registry',
        source_repository: 'test/empty',
        source_repository_description: '',
        last_updated: '2025-10-12T00:00:00Z',
      },
      items: [],
    }

    const result = flattenItems(data)

    expect(result.items).toHaveLength(0)
    expect(result.totalStars).toBe(0)
  })

  it('should handle sections with no items', () => {
    const data: RegistryData = {
      metadata: {
        title: 'Test Registry',
        source_repository: 'test/repo',
        source_repository_description: '',
        last_updated: '2025-10-12T00:00:00Z',
      },
      items: [
        {
          title: 'Empty Category',
          description: 'No items here',
          items: [],
        },
      ],
    }

    const result = flattenItems(data)

    expect(result.items).toHaveLength(0)
    expect(result.totalStars).toBe(0)
  })

  it('should handle archived repositories', () => {
    const data: RegistryData = {
      metadata: {
        title: 'Test Registry',
        source_repository: 'test/repo',
        source_repository_description: '',
        last_updated: '2025-10-12T00:00:00Z',
      },
      items: [
        {
          title: 'Old Projects',
          description: 'Archived projects',
          items: [
            {
              title: 'Archived Item',
              description: 'No longer maintained',
              children: [],
              repo_info: {
                owner: 'old-org',
                repo: 'abandoned',
                stars: 500,
                language: null,
                last_commit: '2020-01-01T00:00:00Z',
                archived: true,
              },
            },
          ],
        },
      ],
    }

    const result = flattenItems(data)

    expect(result.items).toHaveLength(1)
    expect(result.totalStars).toBe(500)
    expect(result.items[0].data.repo_info?.archived).toBe(true)
  })
})
