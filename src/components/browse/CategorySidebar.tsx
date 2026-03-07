import type { FilterOptions } from '@/lib/db/repositories/search-repository'

import { SidebarFilterSection } from './SidebarFilterSection'

interface CategorySidebarProps {
  filterOptions: FilterOptions
  selectedCategory?: string
  selectedLanguage?: string
  selectedRegistry?: string
}

export function CategorySidebar({
  filterOptions,
  selectedCategory,
  selectedRegistry,
  selectedLanguage,
}: CategorySidebarProps) {
  // Build items for each section
  const categoryItems = filterOptions.categories.map(c => ({
    count: c.count,
    label: c.name,
    value: c.name,
  }))

  const registryItems = filterOptions.registries.map(r => ({
    count: r.count,
    label: r.label,
    value: r.name,
  }))

  const languageItems = filterOptions.languages.map(l => ({
    count: l.count,
    label: l.name,
    value: l.name,
  }))

  return (
    <aside className="w-64 shrink-0">
      <div className="sticky top-8 space-y-5">
        {/* Categories Section */}
        <SidebarFilterSection
          items={categoryItems}
          maxHeight="max-h-64"
          paramKey="cat"
          searchPlaceholder="Search categories..."
          selectedValue={selectedCategory}
          title="Categories"
        />

        {/* Registries Section */}
        <SidebarFilterSection
          items={registryItems}
          maxHeight="max-h-40"
          paramKey="registry"
          searchPlaceholder="Search registries..."
          selectedValue={selectedRegistry}
          title="Registries"
        />

        {/* Languages Section */}
        <SidebarFilterSection
          items={languageItems}
          maxHeight="max-h-40"
          paramKey="lang"
          searchPlaceholder="Search languages..."
          selectedValue={selectedLanguage}
          title="Languages"
        />
      </div>
    </aside>
  )
}
