import { describe, it, expect } from 'vitest'

import { normalizeTagName } from '@/lib/utils/tags'

describe('normalizeTagName', () => {
  describe('basic cleanup', () => {
    it('should trim whitespace', () => {
      const result = normalizeTagName('  React Hooks  ')
      expect(result).not.toBeNull()
      expect(result!.name).toBe('React Hooks')
      expect(result!.slug).toBe('react-hooks')
    })

    it('should remove emojis', () => {
      const result = normalizeTagName('🚀 Performance Tools')
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Performance Tools')
      expect(result!.slug).toBe('performance-tools')
    })
  })

  describe('noise removal', () => {
    it('should remove parenthetical content', () => {
      const result = normalizeTagName('React Components (UI)')
      expect(result).not.toBeNull()
      expect(result!.name).toBe('React Components')
    })

    it('should remove bracketed content', () => {
      const result = normalizeTagName('API Clients [Deprecated]')
      expect(result).not.toBeNull()
      expect(result!.name).toBe('API Clients')
    })

    it('should remove "for" prefix', () => {
      const result = normalizeTagName('for Kubernetes')
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Kubernetes')
    })

    it('should remove "with" prefix', () => {
      const result = normalizeTagName('with TypeScript')
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Typescript') // Title case applied
    })
  })

  describe('skip conditions', () => {
    it('should skip very short names (<=2 chars)', () => {
      expect(normalizeTagName('Go')).toBeNull()
      expect(normalizeTagName('AI')).toBeNull()
    })

    it('should skip meta-section headers', () => {
      expect(normalizeTagName('Contents')).toBeNull()
      expect(normalizeTagName('License')).toBeNull()
      expect(normalizeTagName('Contributing')).toBeNull()
      expect(normalizeTagName('Table of Contents')).toBeNull()
    })

    it('should skip "What is X?" patterns', () => {
      expect(normalizeTagName('What is React?')).toBeNull()
    })

    it('should skip empty strings', () => {
      expect(normalizeTagName('')).toBeNull()
      expect(normalizeTagName('   ')).toBeNull()
    })
  })

  describe('title case', () => {
    it('should apply title case', () => {
      const result = normalizeTagName('react hooks')
      expect(result).not.toBeNull()
      expect(result!.name).toBe('React Hooks')
    })

    it('should preserve known acronyms', () => {
      // Only preserves if word matches the acronym list exactly (case-sensitive)
      expect(normalizeTagName('API Clients')!.name).toBe('API Clients')
      expect(normalizeTagName('CLI Tools')!.name).toBe('CLI Tools')
      expect(normalizeTagName('UI Components')!.name).toBe('UI Components')
      expect(normalizeTagName('SQL Databases')!.name).toBe('SQL Databases')
    })

    it('should preserve all-caps acronyms', () => {
      expect(normalizeTagName('HTTP servers')!.name).toBe('HTTP Servers')
      expect(normalizeTagName('JSON parsing')!.name).toBe('JSON Parsing')
    })
  })

  describe('slug generation', () => {
    it('should generate URL-friendly slugs', () => {
      expect(normalizeTagName('React Hooks')!.slug).toBe('react-hooks')
      expect(normalizeTagName('API Clients')!.slug).toBe('api-clients')
      expect(normalizeTagName('Web & Mobile')!.slug).toBe('web-and-mobile')
    })
  })

  describe('preservation of original terminology', () => {
    it('should preserve specific heading names (no synonym mapping)', () => {
      // Unlike categories, tags preserve the original author's terminology
      const result = normalizeTagName('React Server Components')
      expect(result).not.toBeNull()
      expect(result!.name).toBe('React Server Components')
    })

    it('should not pluralize (unlike categories)', () => {
      // Tags don't pluralize - they preserve the original form
      const result = normalizeTagName('React Hook')
      expect(result).not.toBeNull()
      expect(result!.name).toBe('React Hook')
    })
  })
})
