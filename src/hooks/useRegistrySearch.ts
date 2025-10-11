import { useEffect, useMemo, useState } from 'react'

import { Index } from 'flexsearch'

import type { RegistryFile, RegistryItem } from '@/types/registry'

interface IndexedItem {
  description: string
  id: string
  item: RegistryItem
  registry: string
  section: string
  title: string
}

export function useRegistrySearch(registries: RegistryFile[]) {
  const [searchIndex, setSearchIndex] = useState<Index | null>(null)
  const [indexedItems, setIndexedItems] = useState<Map<string, IndexedItem>>(
    new Map(),
  )

  // Build search index
  useEffect(() => {
    const index = new Index({
      cache: true,
      tokenize: 'forward',
    })

    const items = new Map<string, IndexedItem>()
    let idCounter = 0

    registries.forEach(registry => {
      registry.data.items.forEach(section => {
        section.items.forEach(item => {
          const id = `${idCounter++}`
          const indexedItem: IndexedItem = {
            description: item.description || '',
            id,
            item,
            registry: registry.name,
            section: section.title,
            title: item.title,
          }

          items.set(id, indexedItem)

          // Index searchable content
          const searchContent = [
            item.title,
            item.description || '',
            item.repo_info?.language || '',
          ]
            .filter(Boolean)
            .join(' ')

          index.add(id, searchContent)
        })
      })
    })

    setSearchIndex(index)
    setIndexedItems(items)
  }, [registries])

  // Search function
  const search = useMemo(
    () =>
      (query: string): IndexedItem[] => {
        if (!searchIndex || !query.trim()) {
          return []
        }

        const results = searchIndex.search(query, { limit: 1000 })
        return results
          .map(id => indexedItems.get(String(id)))
          .filter((item): item is IndexedItem => item !== undefined)
      },
    [searchIndex, indexedItems],
  )

  return { isReady: searchIndex !== null, search }
}
