import { ApiRequestError, apiRequest } from '../data/api'
import type { SessionAppRole, UserRole } from '../domain/types'

export type AuthMode = 'development' | 'production'

export interface AuthSession {
  userId: string
  email: string
  name: string
  role: UserRole
  appRole: SessionAppRole
}

export interface DevelopmentUser {
  id: string
  email: string
  name: string
  role: UserRole
}

export function getAuthMode(): AuthMode {
  const mode = import.meta.env.VITE_AUTH_MODE
  if (mode === 'development') return 'development'
  if (mode === 'production') return 'production'
  throw new Error(`VITE_AUTH_MODE must be "development" or "production"; received ${String(mode)}`)
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    return await apiRequest<AuthSession>('/auth/me')
  } catch (error) {
    if (error instanceof ApiRequestError && error.statusCode === 401) return null
    throw error
  }
}

export function login(email: string, password: string) {
  return apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function logout() {
  await apiRequest<{ ok: true }>('/auth/logout', { method: 'POST' })
}

export function listDevelopmentUsers() {
  requireDevelopmentMode()
  return apiRequest<DevelopmentUser[]>('/auth/development/users')
}

export function loginAsDevelopmentUser(email: string) {
  requireDevelopmentMode()
  const password = import.meta.env.VITE_DEV_AUTH_PASSWORD
  if (!password) throw new Error('VITE_DEV_AUTH_PASSWORD is required in development authentication mode')
  return login(email, password)
}

function requireDevelopmentMode() {
  const mode = getAuthMode()
  if (mode !== 'development') {
    throw new Error(`Development authentication is unavailable in ${mode} mode`)
  }
}
