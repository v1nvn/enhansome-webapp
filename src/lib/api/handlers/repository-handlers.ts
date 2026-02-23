/**
 * Repository API handlers
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import type { Database } from '@/types/database'

import {
  getAllLanguages,
  getLanguagesForRegistry,
} from '../../db/queries/aggregator'
import { getRepoDetail } from '../../db/repositories/repository-repository'

import type { Kysely } from 'kysely'

export type RepoDetail = NonNullable<Awaited<ReturnType<typeof getRepoDetail>>>

export async function fetchLanguagesHandler(
  db: Kysely<Database>,
  data: { registry?: string },
): Promise<string[]> {
  if (data.registry) {
    return getLanguagesForRegistry(db as any, data.registry)
  }
  return getAllLanguages(db as any)
}

export async function fetchRepoDetailHandler(
  db: Kysely<Database>,
  data: { name: string; owner: string },
) {
  return getRepoDetail(db as any, data.owner, data.name)
}
