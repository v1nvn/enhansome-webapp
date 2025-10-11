import type { RegistryItem } from '@/types/registry'

import { RegistryItemCard } from './RegistryItemCard'

interface RegistryItemTreeProps {
  item: RegistryItem
  level?: number
  registry: string
  section: string
}

export function RegistryItemTree({
  item,
  level = 0,
  registry,
  section,
}: RegistryItemTreeProps) {
  return (
    <div className={level > 0 ? 'ml-8 mt-4' : ''}>
      <RegistryItemCard item={item} registry={registry} section={section} />

      {/* Render children recursively */}
      {item.children && item.children.length > 0 && (
        <div className="mt-4 space-y-4">
          {item.children.map((child, index) => (
            <RegistryItemTree
              item={child}
              key={`${child.title}-${index}`}
              level={level + 1}
              registry={registry}
              section={section}
            />
          ))}
        </div>
      )}
    </div>
  )
}
