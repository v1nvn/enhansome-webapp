export interface RegistryData {
  items: RegistrySection[]
  metadata: RegistryMetadata
}

export interface RegistryFile {
  data: RegistryData
  name: string
}

export interface RegistryItem {
  // Rich card fields (Phase 2)
  best_for_tags?: string[]
  bundle_size?: number
  categories?: string[]
  children: RegistryItem[]
  complexity?: 'high' | 'low' | 'medium'
  description: null | string
  license?: string
  match_score?: number
  repo_info?: RepoInfo
  title: string
}

export interface RegistryMetadata {
  last_updated: string
  source_repository: string
  source_repository_description: string
  title: string
}

export interface RegistrySection {
  description: string
  items: RegistryItem[]
  title: string
}

export interface RepoInfo {
  archived: boolean
  language: null | string
  last_commit: string
  owner: string
  repo: string
  stars: number
}
