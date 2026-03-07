import type { SidebarFilterItem } from '@/components/browse/SidebarFilterSection'

import { SidebarFilterSection } from '@/components/browse/SidebarFilterSection'

interface RegistryTagSidebarProps {
  categories: SidebarFilterItem[]
  registryName: string
  selectedCategory?: string
  selectedTag?: string
  tags: SidebarFilterItem[]
}

export function RegistryTagSidebar({
  tags,
  categories,
  selectedTag,
  selectedCategory,
  registryName,
}: RegistryTagSidebarProps) {
  return (
    <aside className="w-64 shrink-0">
      <div className="sticky top-8 space-y-5">
        {/* Tags Section - Primary */}
        <SidebarFilterSection
          basePath={`/registry/${registryName}`}
          items={tags}
          maxHeight="max-h-80"
          paramKey="tag"
          searchPlaceholder="Search tags..."
          selectedValue={selectedTag}
          title="Tags"
        />

        {/* Categories Section - Secondary */}
        {categories.length > 0 && (
          <SidebarFilterSection
            basePath={`/registry/${registryName}`}
            items={categories}
            maxHeight="max-h-48"
            paramKey="cat"
            searchPlaceholder="Search categories..."
            selectedValue={selectedCategory}
            title="Categories"
          />
        )}
      </div>
    </aside>
  )
}
