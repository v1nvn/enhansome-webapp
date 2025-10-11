export interface RegistryData {
  items: RegistrySection[]
  metadata: RegistryMetadata
}

export interface RegistryFile {
  data: RegistryData
  name: string
}

export interface RegistryItem {
  children: RegistryItem[]
  description: null | string
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
