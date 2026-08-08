import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const composeFile = fileURLToPath(new URL('./docker-compose.yml', import.meta.url))
const result = spawnSync(
  'docker',
  ['compose', '--project-name', 'app', '--file', composeFile, 'up', '--detach'],
  { stdio: 'inherit' },
)

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
