// Registry group configuration for hierarchical organization
export interface RegistryGroup {
  description?: string
  icon?: string
  label: string
  registries: string[]
}

export const REGISTRY_GROUPS: RegistryGroup[] = [
  {
    description: 'JavaScript ecosystem packages and libraries',
    icon: '⚡',
    label: 'JavaScript Ecosystem',
    registries: [
      'awesome-javascript',
      'awesome-npm',
      'awesome-react',
      'awesome-vue',
      'awesome-angular',
      'awesome-svelte',
      'awesome-next',
      'awesome-node',
      'awesome-typescript',
    ],
  },
  {
    description: 'Python packages and frameworks',
    icon: '🐍',
    label: 'Python Ecosystem',
    registries: [
      'awesome-python',
      'awesome-django',
      'awesome-flask',
      'awesome-fastapi',
      'awesome-pytorch',
      'awesome-tensorflow',
    ],
  },
  {
    description: 'DevOps, infrastructure, and cloud tools',
    icon: '🔧',
    label: 'DevOps & Infrastructure',
    registries: [
      'awesome-docker',
      'awesome-kubernetes',
      'awesome-terraform',
      'awesome-ansible',
      'awesome-helm',
      'awesome-ci-cd',
      'awesome-prometheus',
      'awesome-grafana',
    ],
  },
  {
    description: 'Programming languages',
    icon: '💻',
    label: 'Languages',
    registries: [
      'awesome-rust',
      'awesome-go',
      'awesome-cpp',
      'awesome-java',
      'awesome-ruby',
      'awesome-php',
      'awesome-csharp',
      'awesome-swift',
      'awesome-kotlin',
      'awesome-scala',
      'awesome-haskell',
      'awesome-elixir',
      'awesome-erlang',
      'awesome-clj',
      'awesome-fsharp',
      'awesome-lua',
      'awesome-r',
    ],
  },
  {
    description: 'Web development frameworks and tools',
    icon: '🌐',
    label: 'Web Development',
    registries: [
      'awesome-webdev',
      'awesome-frontend',
      'awesome-css',
      'awesome-html',
      'awesome-web-performance',
      'awesome-http',
      'awesome-rest',
      'awesome-graphql',
      'awesome-websockets',
    ],
  },
  {
    description: 'Mobile and desktop development',
    icon: '📱',
    label: 'Mobile & Desktop',
    registries: [
      'awesome-ios',
      'awesome-android',
      'awesome-react-native',
      'awesome-flutter',
      'awesome-electron',
      'awesome-tauri',
      'awesome-macos',
      'awesome-windows',
    ],
  },
  {
    description: 'Data science and machine learning',
    icon: '📊',
    label: 'Data & ML',
    registries: [
      'awesome-machine-learning',
      'awesome-data-science',
      'awesome-deep-learning',
      'awesome-nlp',
      'awesome-computer-vision',
      'awesome-mlops',
    ],
  },
  {
    description: 'Security, privacy, and cryptography',
    icon: '🔒',
    label: 'Security',
    registries: [
      'awesome-security',
      'awesome-pentest',
      'awesome-cryptography',
      'awesome-privacy',
      'awesome-owasp',
    ],
  },
]

// Get group for a registry, or null if ungrouped
export function getRegistryGroup(registryName: string): null | RegistryGroup {
  const lowerName = registryName.toLowerCase()
  for (const group of REGISTRY_GROUPS) {
    if (group.registries.some(r => r.toLowerCase() === lowerName)) {
      return group
    }
  }
  return null
}

// Group registries by their group
export function groupRegistries(
  registries: string[],
): Map<null | RegistryGroup, string[]> {
  const grouped = new Map<null | RegistryGroup, string[]>()

  for (const registry of registries) {
    const group = getRegistryGroup(registry)
    if (!grouped.has(group)) {
      grouped.set(group, [])
    }
    const existing = grouped.get(group)
    if (existing) {
      existing.push(registry)
    }
  }

  // Sort registries within each group alphabetically
  for (const [group, regs] of grouped) {
    grouped.set(
      group,
      regs.sort((a, b) => a.localeCompare(b)),
    )
  }

  return grouped
}
