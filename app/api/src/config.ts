import { z } from 'zod'
import type { SimulatorConfig } from './features/simulator-import/contract.js'

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().min(1).default('127.0.0.1'),
  CORS_ORIGIN: z.string().min(1),
  AUTH_MODE: z.literal('development'),
  DEV_AUTH_PASSWORD: z.string().min(1),
  RSC_SIMULATOR_URL: z.url().optional(),
  RSC_SIMULATOR_TOKEN: z.string().min(1).optional(),
  RSC_SIMULATOR_INTERVAL_MS: z.coerce.number().int().min(1000).max(60000).default(5000),
})

export function readConfig(environment: NodeJS.ProcessEnv): AppConfig {
  const parsed = ConfigSchema.safeParse(environment)
  if (!parsed.success) {
    // Do not include configuration values: they may contain credentials.
    throw new Error(`Invalid configuration: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`)
  }
  const value = parsed.data
  if (value.NODE_ENV === 'production') {
    throw new Error('Production startup is blocked: development authentication must be replaced first')
  }
  const origins = value.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  let simulator: SimulatorConfig | undefined
  if (value.RSC_SIMULATOR_URL || value.RSC_SIMULATOR_TOKEN) {
    if (!value.RSC_SIMULATOR_URL || !value.RSC_SIMULATOR_TOKEN) throw new Error('Both RSC_SIMULATOR_URL and RSC_SIMULATOR_TOKEN are required')
    const url = new URL(value.RSC_SIMULATOR_URL)
    const isLocalSimulator = url.protocol === 'http:' && url.hostname === '127.0.0.1'
    const isCloudSimulator = url.origin === 'https://rsc-test-demo.saadsaif0333.workers.dev'
    if ((!isLocalSimulator && !isCloudSimulator) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('RSC_SIMULATOR_URL must be an HTTP 127.0.0.1 origin or https://rsc-test-demo.saadsaif0333.workers.dev, without credentials, query, fragment or a path')
    }
    simulator = { url: url.origin, token: value.RSC_SIMULATOR_TOKEN, intervalMs: value.RSC_SIMULATOR_INTERVAL_MS }
  }
  for (const origin of origins) {
    const url = new URL(origin)
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
      throw new Error('CORS_ORIGIN must contain exact HTTP or HTTPS origins')
    }
  }
  return {
    databaseUrl: value.DATABASE_URL,
    port: value.PORT,
    host: value.HOST,
    origins,
    developmentPassword: value.DEV_AUTH_PASSWORD,
    ...(simulator ? { simulator } : {}),
  }
}

export interface AppConfig {
  databaseUrl: string
  port: number
  host: string
  origins: string[]
  developmentPassword: string
  simulator?: SimulatorConfig
}
