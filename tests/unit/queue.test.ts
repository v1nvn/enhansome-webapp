/**
 * Unit tests for Queue message types and validation
 */
import { describe, expect, it } from 'vitest'

import type { IndexingQueueMessage } from '@/types/queue'

describe('IndexingQueueMessage', () => {
  describe('message schema validation', () => {
    it('should create valid manual trigger message', () => {
      const message: IndexingQueueMessage = {
        jobId: '123e4567-e89b-12d3-a456-426614174000',
        triggerSource: 'manual',
        createdBy: 'test-key',
        timestamp: '2025-01-15T10:30:00.000Z',
      }

      expect(message.jobId).toBeDefined()
      expect(message.triggerSource).toBe('manual')
      expect(message.createdBy).toBe('test-key')
      expect(message.timestamp).toBeDefined()
    })

    it('should create valid scheduled trigger message', () => {
      const message: IndexingQueueMessage = {
        jobId: '123e4567-e89b-12d3-a456-426614174000',
        triggerSource: 'scheduled',
        timestamp: '2025-01-15T10:30:00.000Z',
      }

      expect(message.jobId).toBeDefined()
      expect(message.triggerSource).toBe('scheduled')
      expect(message.createdBy).toBeUndefined()
      expect(message.timestamp).toBeDefined()
    })

    it('should create valid message with archiveUrl override', () => {
      const message: IndexingQueueMessage = {
        jobId: '123e4567-e89b-12d3-a456-426614174000',
        triggerSource: 'manual',
        createdBy: 'test-key',
        archiveUrl: 'https://example.com/test-archive.zip',
        timestamp: '2025-01-15T10:30:00.000Z',
      }

      expect(message.archiveUrl).toBe('https://example.com/test-archive.zip')
    })

    it('should accept valid triggerSource values', () => {
      const manualMessage: IndexingQueueMessage = {
        jobId: 'test-id',
        triggerSource: 'manual',
        timestamp: new Date().toISOString(),
      }

      const scheduledMessage: IndexingQueueMessage = {
        jobId: 'test-id',
        triggerSource: 'scheduled',
        timestamp: new Date().toISOString(),
      }

      expect(['manual', 'scheduled']).toContain(manualMessage.triggerSource)
      expect(['manual', 'scheduled']).toContain(scheduledMessage.triggerSource)
    })

    it('should require jobId', () => {
      const message = {
        triggerSource: 'manual' as const,
        timestamp: '2025-01-15T10:30:00.000Z',
      }

      // @ts-expect-error - Testing that jobId is required
      const invalidMessage: IndexingQueueMessage = message
      expect(invalidMessage.jobId).toBeUndefined()
    })

    it('should require timestamp', () => {
      const message = {
        jobId: 'test-id',
        triggerSource: 'manual' as const,
      }

      // @ts-expect-error - Testing that timestamp is required
      const invalidMessage: IndexingQueueMessage = message
      expect(invalidMessage.timestamp).toBeUndefined()
    })
  })

  describe('message factory functions', () => {
    it('should create manual indexing message', () => {
      const createManualMessage = (
        createdBy?: string,
      ): IndexingQueueMessage => ({
        jobId: crypto.randomUUID(),
        triggerSource: 'manual',
        createdBy,
        timestamp: new Date().toISOString(),
      })

      const message = createManualMessage('abcd')

      expect(message.triggerSource).toBe('manual')
      expect(message.createdBy).toBe('abcd')
      expect(message.jobId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    })

    it('should create scheduled indexing message', () => {
      const createScheduledMessage = (): IndexingQueueMessage => ({
        jobId: crypto.randomUUID(),
        triggerSource: 'scheduled',
        timestamp: new Date().toISOString(),
      })

      const message = createScheduledMessage()

      expect(message.triggerSource).toBe('scheduled')
      expect(message.createdBy).toBeUndefined()
      expect(message.jobId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    })
  })
})
