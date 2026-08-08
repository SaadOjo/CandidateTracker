import type { PrismaClient, Role } from '@prisma/client'
import type { FastifyRequest } from 'fastify'

export type AppRole = 'admin' | 'human_resource' | 'hiring_manager'

export interface AuthSession {
  userId: string
  email: string
  name: string
  role: Role
  appRole: AppRole
}

export interface AuthService {
  getSession(request: FastifyRequest): Promise<AuthSession>
  requireAppRole(request: FastifyRequest, allowedRoles: AppRole[]): Promise<AuthSession>
}

export class AuthError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
  }
}

export function createDummyAuthService(prisma: PrismaClient): AuthService {
  return new DummyAuthService(prisma)
}

class DummyAuthService implements AuthService {
  constructor(private prisma: PrismaClient) {}

  async getSession(request: FastifyRequest): Promise<AuthSession> {
    const userId = getHeaderValue(request, 'x-dev-user-id') ?? process.env.DEV_AUTH_USER_ID
    const user = userId ? await this.findActiveUserById(userId) : await this.findDefaultUser()

    if (!user) throw new AuthError(401, 'Dev auth user not found or inactive')

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      appRole: toAppRole(user.role),
    }
  }

  private findActiveUserById(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, active: true },
      select: { id: true, email: true, name: true, role: true },
    })
  }

  private findDefaultUser() {
    return this.prisma.user.findFirst({
      where: {
        active: true,
        role: { in: ['admin', 'human_resource'] },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, name: true, role: true },
    })
  }

  async requireAppRole(request: FastifyRequest, allowedRoles: AppRole[]): Promise<AuthSession> {
    const session = await this.getSession(request)
    if (!allowedRoles.includes(session.appRole)) {
      throw new AuthError(403, 'Insufficient permissions')
    }
    return session
  }
}

function getHeaderValue(request: FastifyRequest, headerName: string) {
  const value = request.headers[headerName]
  if (Array.isArray(value)) return value[0]
  return value
}

function toAppRole(role: Role): AppRole {
  if (role === 'admin') return 'admin'
  if (role === 'human_resource') return 'human_resource'
  return 'hiring_manager'
}
