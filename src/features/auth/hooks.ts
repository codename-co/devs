/**
 * @module features/auth/hooks
 *
 * React hooks for Teams authentication.
 *
 * These hooks subscribe to the singleton `authService` and re-render
 * components when auth state changes. They are no-ops in Free tier mode.
 */

import { useCallback, useSyncExternalStore } from 'react'
import { authService } from './auth-service'
import type { TeamsAuthState, TeamsUser } from './types'

// Stable references for useSyncExternalStore — authService is a singleton,
// so these never change. Avoids re-subscription on every render.
const subscribe = (onStoreChange: () => void) =>
  authService.subscribe(onStoreChange)
const getSnapshot = () => authService.getState()

/**
 * Subscribe to the full Teams auth state.
 *
 * Returns the current authentication state and action functions.
 * In Free tier mode, `isAuthenticated` is always `false` and actions
 * are safe no-ops.
 *
 * @example
 * ```tsx
 * function LoginButton() {
 *   const { isAuthenticated, isLoading, login, logout, error } = useTeamsAuth()
 *
 *   if (isLoading) return <Spinner />
 *   if (error) return <Alert>{error}</Alert>
 *
 *   return isAuthenticated
 *     ? <button onClick={logout}>Logout</button>
 *     : <button onClick={login}>Login with SSO</button>
 * }
 * ```
 */
export function useTeamsAuth() {
  const state = useSyncExternalStore<TeamsAuthState>(
    subscribe,
    getSnapshot,
    getSnapshot,
  )

  const login = useCallback(() => authService.login(), [])
  const logout = useCallback(() => authService.logout(), [])

  return {
    ...state,
    login,
    logout,
  }
}

/**
 * Subscribe to the authenticated user.
 *
 * Returns `null` when not authenticated or in Free tier mode.
 *
 * @example
 * ```tsx
 * function UserAvatar() {
 *   const user = useTeamsUser()
 *   if (!user) return null
 *   return <img src={user.avatar} alt={user.name} />
 * }
 * ```
 */
export function useTeamsUser(): TeamsUser | null {
  const state = useSyncExternalStore<TeamsAuthState>(
    subscribe,
    getSnapshot,
    getSnapshot,
  )

  return state.user
}

/**
 * Check if the authenticated user is an admin.
 *
 * Returns `false` in Free tier mode or when not authenticated.
 *
 * @example
 * ```tsx
 * function AdminPanel() {
 *   const isAdmin = useIsAdmin()
 *   if (!isAdmin) return null
 *   return <AdminDashboard />
 * }
 * ```
 */
export function useIsAdmin(): boolean {
  const user = useTeamsUser()
  return user?.role === 'admin'
}
