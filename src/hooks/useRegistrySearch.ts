import { useEffect, useMemo, useState } from 'react'
import { Index } from 'flexsearch'
import type { RegistryFile, RegistryItem } from '@/types/registry'

interface IndexedItem {
  id: string
  title: string
  description: string
  registry: string
  section: string
  item: RegistryItem
}

export function useRegistrySearch(registries: Array<RegistryFile>) {
  const [searchIndex, setSearchIndex] = useState<Index | null>(null)
  const [indexedItems, setIndexedItems] = useState<Map<string, IndexedItem>>(
    new Map(),
  )

  // Build search index
  useEffect(() => {
    const index = new Index({
      tokenize: 'forward',
      cache: true,
    })

    const items = new Map<string, IndexedItem>()
    let idCounter = 0

    registries.forEach((registry) => {
      registry.data.items.forEach((section) => {
        section.items.forEach((item) => {
          const id = `${idCounter++}`
          const indexedItem: IndexedItem = {
            id,
            title: item.title,
            description: item.description || '',
            registry: registry.name,
            section: section.title,
            item,
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
    () => (query: string): Array<IndexedItem> => {
      if (!searchIndex || !query.trim()) {
        return []
      }

      const results = searchIndex.search(query, { limit: 1000 })
      return results
        .map((id) => indexedItems.get(String(id)))
        .filter((item): item is IndexedItem => item !== undefined)
    },
    [searchIndex, indexedItems],
  )

  return { search, isReady: searchIndex !== null }
}
