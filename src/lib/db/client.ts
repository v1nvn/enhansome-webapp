/**
 * Kysely database client for querying Cloudflare D1
 */

import { Kysely } from 'kysely'
import { D1Dialect } from 'kysely-d1'

import type { Database } from '@/types/database'

import { createQueryLogger } from './logger'

import type { D1Database } from '@cloudflare/workers-types'

export function createKysely(d1: D1Database): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: d1 }),
    log: createQueryLogger(),
  })
}
