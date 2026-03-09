/**
 * Cloudflare Workflow for indexing registries
 *
 * Splits the indexing process into 8 steps, each with independent CPU limits.
 * This avoids the 10ms CPU timeout on the free Cloudflare Workers plan.
 */

import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
} from 'cloudflare:workers'

import {
  checkIsIndexingRunning,
  createWorkflowHistoryEntry,
  fetchAndCollectStep,
  finalizeStep,
  markIndexingFailed,
  rebuildFacetsStep,
  rebuildFtsStep,
  SerializableCollectedData,
  setIndexingRunning,
  writeAssociationsStep,
  writeCategoriesStep,
  writeRepositoriesStep,
  writeTagsAndMetadataStep,
} from '@/lib/indexer'

export interface WorkflowParams {
  archiveUrl?: string
  createdBy?: string
  triggerSource: 'manual' | 'scheduled'
}

export class IndexingWorkflow extends WorkflowEntrypoint<
  { DB: D1Database },
  WorkflowParams
> {
  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep) {
    const { triggerSource, archiveUrl, createdBy } = event.payload

    console.log(`Starting indexing workflow (source: ${triggerSource})`)

    // Check if indexing is already running
    const isRunning = await step.do('check-running', async () => {
      return checkIsIndexingRunning(this.env.DB)
    })

    if (isRunning) {
      console.log('Indexing already in progress, skipping...')
      return { status: 'skipped', reason: 'already_running' }
    }

    // Create history entry
    const historyId = await step.do('create-history', async () => {
      return createWorkflowHistoryEntry(this.env.DB, triggerSource, createdBy)
    })

    await step.do('set-running', async () => {
      await setIndexingRunning(this.env.DB, historyId)
    })

    let collectedData: SerializableCollectedData
    let collectResult: { errors: string[]; failed: number; success: number }

    try {
      // Step 1: Fetch and collect all data
      const fetchResult = await step.do('fetch-and-collect', async () => {
        return fetchAndCollectStep(this.env.DB, {
          historyId,
          triggerSource,
          archiveUrl,
          createdBy,
        })
      })
      collectedData = fetchResult.collected
      collectResult = {
        errors: fetchResult.errors,
        failed: fetchResult.failed,
        success: fetchResult.success,
      }

      // Step 2: Write repositories
      await step.do('write-repositories', async () => {
        await writeRepositoriesStep(this.env.DB, historyId, collectedData)
      })

      // Step 3: Write tags and metadata
      await step.do('write-tags-metadata', async () => {
        await writeTagsAndMetadataStep(this.env.DB, historyId, collectedData)
      })

      // Step 4: Write associations (registry_repositories and repo_tags)
      await step.do('write-associations', async () => {
        await writeAssociationsStep(this.env.DB, historyId, collectedData)
      })

      // Step 5: Write category associations
      await step.do('write-categories', async () => {
        await writeCategoriesStep(this.env.DB, historyId, collectedData)
      })

      // Step 6: Rebuild facets
      await step.do('rebuild-facets', async () => {
        await rebuildFacetsStep(this.env.DB, historyId)
      })

      // Step 7: Rebuild FTS index
      await step.do('rebuild-fts', async () => {
        await rebuildFtsStep(this.env.DB, historyId)
      })

      // Step 8: Finalize
      await step.do('finalize', async () => {
        await finalizeStep(this.env.DB, historyId, collectResult)
      })

      console.log('Indexing workflow completed successfully')
      return { status: 'completed', ...collectResult }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('Indexing workflow failed:', errorMsg)

      await step.do('mark-failed', async () => {
        await markIndexingFailed(this.env.DB, historyId, errorMsg)
      })

      throw error
    }
  }
}
