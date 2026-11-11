import type { FastifyInstance } from 'fastify'
import type { RouteDependencies } from '../../dependencies.js'
import { LoginSchema } from '../../auth.js'

export function registerAuthRoutes(app: FastifyInstance, { authService }: RouteDependencies) {
  app.get('/auth/me', async (request) => authService.getSession(request))

  app.get('/auth/development/users', async () => authService.listDevelopmentUsers())

  app.post('/auth/login', async (request, reply) => {
    const input = LoginSchema.parse(request.body)
    return authService.login(request, reply, input)
  })

  app.post('/auth/logout', async (request, reply) => {
    await authService.logout(request, reply)
    return { ok: true }
  })
}
