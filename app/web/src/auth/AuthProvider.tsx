import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  getSession,
  loginAsDevelopmentUser,
  logout as requestLogout,
} from './auth'
import { AuthContext } from './AuthContext'
import type { AuthState } from './AuthContext'
const authSessionQueryKey = ['auth', 'session'] as const

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const sessionQuery = useQuery({
    queryKey: authSessionQueryKey,
    queryFn: getSession,
  })
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)

  async function switchDevelopmentUser(email: string) {
    setSwitching(true)
    setSwitchError(null)

    try {
      await queryClient.cancelQueries()
      const session = await loginAsDevelopmentUser(email)
      removeApplicationQueries(queryClient)
      queryClient.setQueryData(authSessionQueryKey, session)
    } catch (error) {
      setSwitchError(error instanceof Error ? error.message : 'Development account switch failed')
    } finally {
      setSwitching(false)
    }
  }

  async function logout() {
    setSwitching(true)
    setSwitchError(null)

    try {
      await queryClient.cancelQueries()
      await requestLogout()
      removeApplicationQueries(queryClient)
      queryClient.setQueryData(authSessionQueryKey, null)
    } catch (error) {
      setSwitchError(error instanceof Error ? error.message : 'Logout failed')
    } finally {
      setSwitching(false)
    }
  }

  let state: AuthState
  if (sessionQuery.isPending) {
    state = { status: 'loading' }
  } else if (sessionQuery.isError) {
    state = { status: 'error', message: sessionQuery.error.message }
  } else if (switching) {
    state = { status: 'switching', session: sessionQuery.data }
  } else if (sessionQuery.data) {
    state = { status: 'authenticated', session: sessionQuery.data }
  } else {
    state = { status: 'unauthenticated' }
  }

  return (
    <AuthContext.Provider value={{ state, switchError, switchDevelopmentUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

function removeApplicationQueries(queryClient: QueryClient) {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== 'auth',
  })
}
