import type { RegistryItem } from '@/types/registry'
import { RegistryItemCard } from './RegistryItemCard'

interface RegistryItemTreeProps {
  item: RegistryItem
  registry: string
  section: string
  level?: number
}

export function RegistryItemTree({
  item,
  registry,
  section,
  level = 0,
}: RegistryItemTreeProps) {
  return (
    <div className={level > 0 ? 'ml-8 mt-4' : ''}>
      <RegistryItemCard item={item} registry={registry} section={section} />

      {/* Render children recursively */}
      {item.children && item.children.length > 0 && (
        <div className="mt-4 space-y-4">
          {item.children.map((child, index) => (
            <RegistryItemTree
              key={`${child.title}-${index}`}
              item={child}
              registry={registry}
              section={section}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
