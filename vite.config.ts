import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { devtools } from '@tanstack/devtools-vite'

import { d1InitPlugin } from './vite-plugins/d1-init'

const config = defineConfig({
  plugins: [
    devtools({
      removeDevtoolsOnBuild: true,
    }),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    d1InitPlugin(), // Auto-run D1 migrations and seeding in dev mode
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
