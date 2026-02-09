/**
 * Queue message schema for indexing jobs
 */
export interface IndexingQueueMessage {
  // Optional override URL for testing
  archiveUrl?: string

  // API key identifier (last 4 chars) for manual runs
  createdBy?: string

  // Unique identifier for this indexing job
  jobId: string

  // Timestamp when message was created
  timestamp: string

  // Source of trigger: 'manual' or 'scheduled'
  triggerSource: 'manual' | 'scheduled'
}
