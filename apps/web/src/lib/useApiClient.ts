'use client'

import { useAuth, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useCallback, useRef } from 'react'

export function useApiClient() {
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const tokenCache = useRef<{ token: string; expiresAt: number } | null>(null)

  const authHeaders = useCallback(async (headers?: HeadersInit) => {
    let token = tokenCache.current && tokenCache.current.expiresAt > Date.now()
      ? tokenCache.current.token
      : ''

    if (!token) {
      token = await getToken() || ''
      if (token) {
        tokenCache.current = { token, expiresAt: Date.now() + 45_000 }
      }
    }

    if (!token) {
      router.push('/sign-in')
      throw new Error('No autorizado')
    }

    const resolvedHeaders = new Headers(headers)
    resolvedHeaders.set('X-Clerk-Session-Token', token)
    return resolvedHeaders
  }, [getToken, router])

  const authorizedFetch = useCallback(async (url: string, options?: RequestInit) => {
    const hasFormDataBody = typeof FormData !== 'undefined' && options?.body instanceof FormData
    const headers = new Headers(options?.headers)
    if (!hasFormDataBody && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    const auth = await authHeaders(headers)
    const response = await fetch(url, {
      ...options,
      headers: auth,
    })

    if (response.status === 401) {
      tokenCache.current = null
      router.push('/sign-in')
      return response
    }

    if (response.status === 403) {
      tokenCache.current = null
      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json') ? await response.clone().json() : null
      await signOut({ redirectUrl: '/sign-in?unauthorized=1' })
      throw new Error(data?.error?.message || 'Usuario no autorizado')
    }

    return response
  }, [authHeaders, router, signOut])

  const requestJson = useCallback(async <T,>(url: string, options?: RequestInit): Promise<T | null> => {
    const response = await authorizedFetch(url, options)
    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json') ? await response.json() : null
    if (response.status === 401) return null
    if (!response.ok) throw new Error(data?.error?.message || `No pudimos completar la acción (${response.status}) en ${url}`)
    return data as T
  }, [authorizedFetch])

  return { authHeaders, authorizedFetch, isLoaded, isSignedIn, requestJson }
}
