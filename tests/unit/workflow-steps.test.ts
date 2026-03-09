/**
 * Unit tests for workflow step functions
 * Tests individual step functions in isolation
 */
import { describe, expect, it } from 'vitest'

import {
  collectedDataFromSerializable,
  collectedDataToSerializable,
  WORKFLOW_STEPS,
  type CollectedData,
  type SerializableCollectedData,
} from '@/lib/indexer'

describe('Workflow Steps Configuration', () => {
  describe('WORKFLOW_STEPS', () => {
    it('should have all required steps', () => {
      const expectedSteps = [
        'fetch-and-collect',
        'write-repositories',
        'write-tags-metadata',
        'write-associations',
        'write-categories',
        'rebuild-facets',
        'rebuild-fts',
        'finalize',
      ]

      expect(Object.keys(WORKFLOW_STEPS)).toEqual(expect.arrayContaining(expectedSteps))
    })

    it('should have progress values between 0 and 100', () => {
      for (const [name, step] of Object.entries(WORKFLOW_STEPS)) {
        expect(step.progress, `Step ${name} progress should be > 0`).toBeGreaterThan(0)
        expect(step.progress, `Step ${name} progress should be <= 100`).toBeLessThanOrEqual(100)
      }
    })

    it('should have non-empty messages for all steps', () => {
      for (const [name, step] of Object.entries(WORKFLOW_STEPS)) {
        expect(step.message, `Step ${name} should have a message`).toBeTruthy()
        expect(typeof step.message).toBe('string')
        expect(step.message.length).toBeGreaterThan(0)
      }
    })

    it('should have unique progress values', () => {
      const progressValues = Object.values(WORKFLOW_STEPS).map(s => s.progress)
      const uniqueValues = new Set(progressValues)
      expect(uniqueValues.size).toBe(progressValues.length)
    })
  })
})

describe('Collected Data Serialization', () => {
  describe('collectedDataToSerializable', () => {
    it('should convert Maps to arrays', () => {
      const collected: CollectedData = {
        metadata: [],
        registryRepos: [],
        repoCategories: [],
        repos: new Map([
          ['owner/repo1', { owner: 'owner', name: 'repo1', description: 'test', stars: 100, language: 'ts', lastCommit: '2024-01-01', archived: 0 }],
          ['owner/repo2', { owner: 'owner', name: 'repo2', description: null, stars: 200, language: null, lastCommit: null, archived: 1 }],
        ]),
        repoTags: [],
        tags: new Map([
          ['tag1', { name: 'Tag 1', slug: 'tag1' }],
          ['tag-2', { name: 'Tag 2', slug: 'tag-2' }],
        ]),
      }

      const serialized = collectedDataToSerializable(collected)

      expect(Array.isArray(serialized.repos)).toBe(true)
      expect(serialized.repos).toHaveLength(2)
      expect(serialized.repos[0]).toEqual(['owner/repo1', expect.any(Object)])

      expect(Array.isArray(serialized.tags)).toBe(true)
      expect(serialized.tags).toHaveLength(2)
    })

    it('should handle empty Maps', () => {
      const collected: CollectedData = {
        metadata: [],
        registryRepos: [],
        repoCategories: [],
        repos: new Map(),
        repoTags: [],
        tags: new Map(),
      }

      const serialized = collectedDataToSerializable(collected)

      expect(serialized.repos).toEqual([])
      expect(serialized.tags).toEqual([])
    })

    it('should preserve arrays as-is', () => {
      const collected: CollectedData = {
        metadata: [{ registryName: 'test', title: 'Test', description: 'desc', lastUpdated: '2024-01-01', sourceRepository: 'test/repo', totalItems: 10, totalStars: 100 }],
        registryRepos: [{ registryName: 'test', repoKey: 'owner/repo', title: 'Repo' }],
        repoCategories: [{ registryName: 'test', repoKey: 'owner/repo', categorySlug: 'cat1' }],
        repos: new Map(),
        repoTags: [{ registryName: 'test', repoKey: 'owner/repo', tagSlug: 'tag1', categorySlug: null }],
        tags: new Map(),
      }

      const serialized = collectedDataToSerializable(collected)

      expect(serialized.metadata).toEqual(collected.metadata)
      expect(serialized.registryRepos).toEqual(collected.registryRepos)
      expect(serialized.repoCategories).toEqual(collected.repoCategories)
      expect(serialized.repoTags).toEqual(collected.repoTags)
    })
  })

  describe('collectedDataFromSerializable', () => {
    it('should convert arrays back to Maps', () => {
      const serialized: SerializableCollectedData = {
        metadata: [],
        registryRepos: [],
        repoCategories: [],
        repos: [
          ['owner/repo1', { owner: 'owner', name: 'repo1', description: 'test', stars: 100, language: 'ts', lastCommit: '2024-01-01', archived: 0 }],
        ],
        repoTags: [],
        tags: [
          ['tag1', { name: 'Tag 1', slug: 'tag1' }],
        ],
      }

      const collected = collectedDataFromSerializable(serialized)

      expect(collected.repos).toBeInstanceOf(Map)
      expect(collected.repos.size).toBe(1)
      expect(collected.repos.get('owner/repo1')).toEqual({
        owner: 'owner',
        name: 'repo1',
        description: 'test',
        stars: 100,
        language: 'ts',
        lastCommit: '2024-01-01',
        archived: 0,
      })

      expect(collected.tags).toBeInstanceOf(Map)
      expect(collected.tags.size).toBe(1)
    })

    it('should handle empty arrays', () => {
      const serialized: SerializableCollectedData = {
        metadata: [],
        registryRepos: [],
        repoCategories: [],
        repos: [],
        repoTags: [],
        tags: [],
      }

      const collected = collectedDataFromSerializable(serialized)

      expect(collected.repos.size).toBe(0)
      expect(collected.tags.size).toBe(0)
    })
  })

  describe('round-trip serialization', () => {
    it('should preserve data through serialize/deserialize cycle', () => {
      const original: CollectedData = {
        metadata: [
          { registryName: 'react', title: 'React', description: 'React registry', lastUpdated: '2024-01-01', sourceRepository: 'test/react', totalItems: 100, totalStars: 5000 },
        ],
        registryRepos: [
          { registryName: 'react', repoKey: 'facebook/react', title: 'React' },
          { registryName: 'react', repoKey: 'facebook/react-dom', title: 'ReactDOM' },
        ],
        repoCategories: [
          { registryName: 'react', repoKey: 'facebook/react', categorySlug: 'ui-frameworks' },
        ],
        repos: new Map([
          ['facebook/react', { owner: 'facebook', name: 'react', description: 'React library', stars: 200000, language: 'JavaScript', lastCommit: '2024-03-01', archived: 0 }],
          ['facebook/react-dom', { owner: 'facebook', name: 'react-dom', description: 'React DOM', stars: 150000, language: 'JavaScript', lastCommit: '2024-03-01', archived: 0 }],
        ]),
        repoTags: [
          { registryName: 'react', repoKey: 'facebook/react', tagSlug: 'ui', categorySlug: 'ui-frameworks' },
          { registryName: 'react', repoKey: 'facebook/react', tagSlug: 'frontend', categorySlug: null },
        ],
        tags: new Map([
          ['ui', { name: 'UI', slug: 'ui' }],
          ['frontend', { name: 'Frontend', slug: 'frontend' }],
        ]),
      }

      const serialized = collectedDataToSerializable(original)
      const deserialized = collectedDataFromSerializable(serialized)

      expect(deserialized.metadata).toEqual(original.metadata)
      expect(deserialized.registryRepos).toEqual(original.registryRepos)
      expect(deserialized.repoCategories).toEqual(original.repoCategories)
      expect(deserialized.repoTags).toEqual(original.repoTags)

      // Maps should have same entries
      expect(deserialized.repos.size).toBe(original.repos.size)
      for (const [key, value] of original.repos) {
        expect(deserialized.repos.get(key)).toEqual(value)
      }

      expect(deserialized.tags.size).toBe(original.tags.size)
      for (const [key, value] of original.tags) {
        expect(deserialized.tags.get(key)).toEqual(value)
      }
    })

    it('should handle complex data with special characters', () => {
      const original: CollectedData = {
        metadata: [],
        registryRepos: [],
        repoCategories: [],
        repos: new Map([
          ['org/repo-with-dashes', { owner: 'org', name: 'repo-with-dashes', description: 'A repo with "quotes" and \'apostrophes\'', stars: 100, language: 'TypeScript', lastCommit: '2024-01-01T00:00:00Z', archived: 0 }],
          ['org/repo_with_underscores', { owner: 'org', name: 'repo_with_underscores', description: 'Unicode: 你好 世界 🎉', stars: 50, language: null, lastCommit: null, archived: 0 }],
        ]),
        repoTags: [],
        tags: new Map([
          ['tag-with-dash', { name: 'Tag With Dash', slug: 'tag-with-dash' }],
          ['tag_with_underscore', { name: 'Tag With Underscore', slug: 'tag_with_underscore' }],
        ]),
      }

      const serialized = collectedDataToSerializable(original)
      const deserialized = collectedDataFromSerializable(serialized)

      expect(deserialized.repos.get('org/repo-with-dashes')?.description).toBe('A repo with "quotes" and \'apostrophes\'')
      expect(deserialized.repos.get('org/repo_with_underscores')?.description).toBe('Unicode: 你好 世界 🎉')
      expect(deserialized.tags.get('tag-with-dash')?.name).toBe('Tag With Dash')
    })
  })
})
