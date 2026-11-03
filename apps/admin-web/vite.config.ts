import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/admin/',
  plugins: [vue(), tailwindcss(), {
    name: 'admin-template-license',
    generateBundle() {
      this.emitFile({
        type: 'asset', fileName: 'licenses/naive-ui-admin.txt',
        source: readFileSync(new URL('./third-party/naive-ui-admin/LICENSE', import.meta.url), 'utf8'),
      })
    },
  }],
  build: { license: { fileName: 'licenses/dependencies.json' } },
  server: { port: 5174, proxy: { '/api': 'http://127.0.0.1:3000' } },
})
