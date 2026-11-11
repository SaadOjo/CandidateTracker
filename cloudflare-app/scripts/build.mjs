import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const web = fileURLToPath(new URL('../../app/web/', import.meta.url))
const output = fileURLToPath(new URL('../dist/client/', import.meta.url))
const vite = fileURLToPath(new URL('../../app/node_modules/vite/bin/vite.js', import.meta.url))
execFileSync(process.execPath, [vite, 'build', '--outDir', output, '--emptyOutDir'], {
  cwd: web, stdio: 'inherit',
  env: { ...process.env, VITE_API_URL: '/api', VITE_AUTH_MODE: 'development', VITE_DEV_AUTH_PASSWORD: 'cloudflare-public-demo', VITE_CLOUDFLARE_DEMO: 'true' },
})
