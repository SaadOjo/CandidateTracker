import type { FastifyInstance } from 'fastify'
import type { RouteDependencies } from '../../dependencies.js'
import { ListUsersQuerySchema } from '../../domain.js'

export function registerUserRoutes(app: FastifyInstance, { prisma }: RouteDependencies) {
  app.get('/users', async (request) => {
    const query = ListUsersQuerySchema.parse(request.query)

    return prisma.user.findMany({
      where: {
        active: true,
        role: query.role,
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, role: true, active: true },
    })
  })
}
