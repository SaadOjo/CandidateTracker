import type { PrismaClient } from '@prisma/client'
import type { AuthService } from './auth.js'

export interface RouteDependencies {
  prisma: PrismaClient
  authService: AuthService
}
