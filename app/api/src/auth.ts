import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { PrismaClient, Role } from '@prisma/client'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

const SESSION_COOKIE_NAME = 'candidate_tracker_session'
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000

export type AppRole = 'admin' | 'human_resource' | 'hiring_manager'

export interface AuthSession {
  userId: string
  email: string
  name: string
  role: Role
  appRole: AppRole
}

export interface DevelopmentUser {
  id: string
  email: string
  name: string
  role: Role
}

export const LoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export interface AuthService {
  getSession(request: FastifyRequest): Promise<AuthSession>
  login(
    request: FastifyRequest,
    reply: FastifyReply,
    input: z.infer<typeof LoginSchema>,
  ): Promise<AuthSession>
  logout(request: FastifyRequest, reply: FastifyReply): Promise<void>
  listDevelopmentUsers(): Promise<DevelopmentUser[]>
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

export function createAuthService(prisma: PrismaClient, developmentPassword: string): AuthService {
  if (!developmentPassword) throw new Error('Development authentication requires a password')
  return new DevelopmentAuthService(prisma, developmentPassword)
}

class DevelopmentAuthService implements AuthService {
  private sessions = new WeakMap<FastifyRequest, AuthSession>()

  constructor(
    private prisma: PrismaClient,
    private developmentPassword: string,
  ) {}

  async getSession(request: FastifyRequest): Promise<AuthSession> {
    const cached = this.sessions.get(request)
    if (cached) return cached
    const token = request.cookies[SESSION_COOKIE_NAME]
    if (!token) throw new AuthError(401, 'Authentication required')

    const session = await this.prisma.webSession.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true, active: true },
        },
      },
    })

    if (!session) throw new AuthError(401, 'Authentication required')
    if (session.expiresAt.getTime() <= Date.now() || !session.user.active) {
      await this.prisma.webSession.deleteMany({ where: { id: session.id } })
      throw new AuthError(401, 'Authentication required')
    }

    const authenticated = toAuthSession(session.user)
    this.sessions.set(request, authenticated)
    return authenticated
  }

  async login(
    request: FastifyRequest,
    reply: FastifyReply,
    input: z.infer<typeof LoginSchema>,
  ): Promise<AuthSession> {
    if (!passwordsMatch(input.password, this.developmentPassword)) {
      throw new AuthError(401, 'Invalid email or password')
    }

    const user = await this.prisma.user.findFirst({
      where: { email: input.email, active: true },
      select: { id: true, email: true, name: true, role: true },
    })
    if (!user) throw new AuthError(401, 'Invalid email or password')

    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
    const currentToken = request.cookies[SESSION_COOKIE_NAME]

    await this.prisma.$transaction(async (transaction) => {
      if (currentToken) {
        await transaction.webSession.deleteMany({
          where: { tokenHash: hashToken(currentToken) },
        })
      }
      await transaction.webSession.deleteMany({
        where: { expiresAt: { lte: new Date() } },
      })
      await transaction.webSession.create({
        data: {
          tokenHash: hashToken(token),
          userId: user.id,
          expiresAt,
        },
      })
    })

    reply.setCookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      expires: expiresAt,
    })

    return toAuthSession(user)
  }

  async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const token = request.cookies[SESSION_COOKIE_NAME]
    if (token) {
      await this.prisma.webSession.deleteMany({
        where: { tokenHash: hashToken(token) },
      })
    }

    reply.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    })
  }

  listDevelopmentUsers(): Promise<DevelopmentUser[]> {
    return this.prisma.user.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
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

function toAuthSession(user: { id: string; email: string; name: string; role: Role }): AuthSession {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    appRole: toAppRole(user.role),
  }
}

function toAppRole(role: Role): AppRole {
  if (role === 'admin') return 'admin'
  if (role === 'human_resource') return 'human_resource'
  if (role === 'hiring_manager') return 'hiring_manager'
  throw new Error(`Unsupported role: ${String(role)}`)
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function passwordsMatch(input: string, expected: string) {
  const inputHash = createHash('sha256').update(input).digest()
  const expectedHash = createHash('sha256').update(expected).digest()
  return timingSafeEqual(inputHash, expectedHash)
}
