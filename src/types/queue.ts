/**
 * Queue message schema for indexing jobs
 */
export interface IndexingQueueMessage {
  // Unique identifier for this indexing job
  jobId: string

  // Source of trigger: 'manual' or 'scheduled'
  triggerSource: 'manual' | 'scheduled'

  // API key identifier (last 4 chars) for manual runs
  createdBy?: string

  // Optional override URL for testing
  archiveUrl?: string

  // Timestamp when message was created
  timestamp: string
}
