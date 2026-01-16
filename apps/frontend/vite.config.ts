import { defineConfig } from 'vite'
import deno from '@deno/vite-plugin'
import react from '@vitejs/plugin-react-swc'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(new URL('.', import.meta.url)))
const repoRoot = resolve(projectRoot, '..')

// https://vite.dev/config/
export default defineConfig({
  plugins: [deno(), react()],
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
})
