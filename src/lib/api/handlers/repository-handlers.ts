/**
 * Repository API handlers
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import type { Database } from '@/types/database'

import { getRepoDetail } from '../../db/repositories/repository-repository'

import type { Kysely } from 'kysely'

export type RepoDetail = NonNullable<Awaited<ReturnType<typeof getRepoDetail>>>

export async function fetchRepoDetailHandler(
  db: Kysely<Database>,
  data: { name: string; owner: string },
) {
  return getRepoDetail(db as any, data.owner, data.name)
}
