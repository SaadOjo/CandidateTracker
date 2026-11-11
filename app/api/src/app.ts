import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import Fastify from 'fastify'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { AuthError } from './auth.js'
import type { AppConfig } from './config.js'
import type { RouteDependencies } from './dependencies.js'
import { ApiError } from './errors.js'
import { registerAuthRoutes } from './features/auth/routes.js'
import { registerCandidateRoutes } from './features/candidates/routes.js'
import { registerProjectRoutes } from './features/projects/routes.js'
import { registerRejectionFollowUpRoutes } from './features/rejection-follow-ups/routes.js'
import { registerUserRoutes } from './features/users/routes.js'
import { registerSimulatorImportRoutes } from './features/simulator-import/routes.js'
import { createSimulatorIntegration } from './features/simulator-import/service.js'

export async function buildApp(dependencies: RouteDependencies & { config: AppConfig; logger?: boolean }) {
  const { config, authService, prisma } = dependencies
  const app = Fastify({
    logger: dependencies.logger === false ? false : {
      redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
    },
  })
  await app.register(helmet)
  await app.register(cookie)
  await app.register(cors, {
    origin: config.origins,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
    credentials: true,
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.issues })
    }
    if (error instanceof ApiError || error instanceof AuthError) {
      return reply.status(error.statusCode).send({ error: error.message })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002' || error.code === 'P2034') {
        return reply.status(409).send({ error: 'The record changed or conflicts with an existing record. Reload and try again.' })
      }
      if (error.code === 'P2025') return reply.status(404).send({ error: 'Record not found' })
    }
    const status = (error as { statusCode?: number }).statusCode
    if (status && status >= 400 && status < 500) {
      return reply.status(status).send({ error: error instanceof Error ? error.message : 'Request failed' })
    }
    request.log.error(error)
    return reply.status(500).send({ error: 'Internal server error' })
  })

  app.addHook('onRequest', async (request) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const origin = request.headers.origin
      if (origin && !config.origins.includes(origin)) throw new ApiError(403, 'Origin is not allowed')
      if (request.headers['sec-fetch-site'] === 'cross-site') throw new ApiError(403, 'Cross-site requests are not allowed')
    }
  })

  app.get('/health', async () => ({ ok: true }))
  app.get('/ready', async () => {
    await prisma.$queryRaw`SELECT 1`
    return { ok: true }
  })
  registerAuthRoutes(app, dependencies)
  const simulator = config.simulator ? createSimulatorIntegration(prisma, config.simulator) : undefined
  if (simulator && config.simulator) {
    let timer: ReturnType<typeof setInterval> | undefined
    let pending: Promise<void> | undefined
    const sync = () => {
      if (pending) return
      pending = simulator.syncTrackedProjects().then((errors) => {
        for (const error of errors) app.log.error(error, 'Simulator project sync failed')
      }).catch((error: unknown) => app.log.error(error, 'Simulator tracking failed')).finally(() => { pending = undefined })
    }
    const interval = config.simulator.intervalMs
    app.addHook('onReady', async () => { sync(); timer = setInterval(sync, interval); timer.unref() })
    app.addHook('preClose', async () => { clearInterval(timer); await pending })
  }

  await app.register(async (protectedApp) => {
    protectedApp.addHook('onRequest', async (request) => {
      await authService.getSession(request)
    })
    registerUserRoutes(protectedApp, dependencies)
    registerProjectRoutes(protectedApp, dependencies)
    registerCandidateRoutes(protectedApp, dependencies)
    registerRejectionFollowUpRoutes(protectedApp, dependencies)
    registerSimulatorImportRoutes(protectedApp, dependencies, simulator)
  })
  return app
}
