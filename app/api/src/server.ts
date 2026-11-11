import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { buildApp } from './app.js'
import { createAuthService } from './auth.js'
import { readConfig } from './config.js'

const config = readConfig(process.env)
const prisma = new PrismaClient({ datasourceUrl: config.databaseUrl })
const app = await buildApp({ prisma, authService: createAuthService(prisma, config.developmentPassword), config })
app.addHook('onClose', async () => prisma.$disconnect())

let closing = false
async function shutdown() {
  if (closing) return
  closing = true
  try {
    await app.close()
  } catch (error) {
    app.log.error(error, 'Shutdown failed')
    process.exitCode = 1
  }
}

process.once('SIGINT', () => void shutdown())
process.once('SIGTERM', () => void shutdown())

try {
  await prisma.$connect()
  await app.listen({ port: config.port, host: config.host })
} catch (error) {
  app.log.error(error, 'Startup failed')
  process.exitCode = 1
  await shutdown()
}
