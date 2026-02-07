import { describe, it, expect } from 'vitest'
import {
  discoverRegistries,
  fetchRegistryFiles,
  extractRegistryName,
} from '@/lib/indexer'

// Use deterministic commit SHA for integration tests
const TEST_ARCHIVE_URL =
  'https://github.com/v1nvn/enhansome-registry/archive/dc22be07d65168379a3d12825730ecf5ee2dc32d.zip'

describe('Registry Discovery with Real Data', () => {
  // These tests use real network requests to GitHub
  // They may be slower and require internet connectivity

  describe('discoverRegistries', () => {
    it('should discover registries from GitHub archive', async () => {
      const registries = await discoverRegistries(TEST_ARCHIVE_URL)

      // Should discover multiple registries
      expect(registries.length).toBeGreaterThan(0)

      // Each registry should be in "owner/repo" format
      for (const registry of registries) {
        expect(registry).toMatch(/^[^/]+\/[^/]+$/)
      }

      // Known registries that should exist
      expect(registries).toContain('v1nvn/enhansome-go')
      expect(registries).toContain('v1nvn/enhansome-mcp-servers')
    })

    it('should return unique registry paths', async () => {
      const registries = await discoverRegistries(TEST_ARCHIVE_URL)
      const uniqueRegistries = new Set(registries)

      expect(registries.length).toBe(uniqueRegistries.size)
    })
  })

  describe('fetchRegistryFiles', () => {
    it('should fetch and parse registry data from discovered registries', async () => {
      const files = await fetchRegistryFiles()

      // Should have fetched at least some registries successfully
      expect(files.size).toBeGreaterThan(0)

      // Check that each entry has valid data structure
      for (const [registryName, data] of files.entries()) {
        // Registry name should be normalized (no "enhansome-" prefix)
        expect(registryName).not.toMatch(/^enhansome-/)

        // Data should have required fields
        expect(data).toHaveProperty('metadata')
        expect(data).toHaveProperty('items')
        expect(Array.isArray(data.items)).toBe(true)

        // Metadata should have required fields
        expect(data.metadata).toHaveProperty('title')
        expect(data.metadata).toHaveProperty('source_repository')
      }
    })

    it('should include known registries', async () => {
      const files = await fetchRegistryFiles()

      // Known registry names (without "enhansome-" prefix)
      const knownRegistries = ['go', 'mcp-servers', 'selfhosted']

      // At least some known registries should be present
      const foundRegistries = knownRegistries.filter((r) =>
        files.has(r),
      )
      expect(foundRegistries.length).toBeGreaterThan(0)
    })

    it('should handle registries with missing data.json gracefully', async () => {
      // This test verifies that the function continues even if some registries
      // have missing or invalid data.json files
      const files = await fetchRegistryFiles()

      // Should not throw and should return whatever it could fetch
      expect(files).toBeInstanceOf(Map)
    })
  })

  describe('extractRegistryName with real data', () => {
    it('should normalize owner/repo format correctly', () => {
      expect(extractRegistryName('v1nvn/enhansome-go')).toBe('go')
      expect(extractRegistryName('v1nvn/enhansome-mcp-servers')).toBe(
        'mcp-servers',
      )
      expect(extractRegistryName('v1nvn/enhansome-selfhosted')).toBe(
        'selfhosted',
      )
    })

    it('should handle repo names without owner', () => {
      expect(extractRegistryName('enhansome-go')).toBe('go')
      expect(extractRegistryName('enhansome-mcp-servers')).toBe('mcp-servers')
    })

    it('should handle names without prefix', () => {
      expect(extractRegistryName('go')).toBe('go')
      expect(extractRegistryName('rust')).toBe('rust')
    })
  })
})
