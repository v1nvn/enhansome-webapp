import type { SidebarFilterItem } from '@/components/browse/SidebarFilterSection'

import { SidebarFilterSection } from '@/components/browse/SidebarFilterSection'

interface FilterSidebarProps {
  sections: FilterSidebarSection[]
}

interface FilterSidebarSection {
  basePath?: string
  items: SidebarFilterItem[]
  maxHeight?: string
  paramKey: string
  searchPlaceholder?: string
  selectedValue?: string
  title: string
}

export function FilterSidebar({ sections }: FilterSidebarProps) {
  return (
    <aside className="w-64 shrink-0">
      <div className="sticky top-8 space-y-5">
        {sections.map(section => (
          <SidebarFilterSection key={section.paramKey} {...section} />
        ))}
      </div>
    </aside>
  )
}
