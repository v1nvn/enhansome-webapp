export interface RepoInfo {
  archived: boolean
  language: string | null
  last_commit: string
  owner: string
  repo: string
  stars: number
}

export interface RegistryItem {
  children: RegistryItem[]
  description: string | null
  title: string
  repo_info?: RepoInfo
}

export interface RegistrySection {
  description: string
  items: RegistryItem[]
  title: string
}

export interface RegistryMetadata {
  last_updated: string
  source_repository: string
  source_repository_description: string
  title: string
}

export interface RegistryData {
  items: RegistrySection[]
  metadata: RegistryMetadata
}

export interface RegistryFile {
  name: string
  data: RegistryData
}
