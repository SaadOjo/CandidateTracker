import { createContext } from 'react'
import type { AuthSession } from './auth'

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; session: AuthSession }
  | { status: 'switching'; session: AuthSession | null }
  | { status: 'error'; message: string }

export interface AuthContextValue {
  state: AuthState
  switchError: string | null
  switchDevelopmentUser(email: string): Promise<void>
  logout(): Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
