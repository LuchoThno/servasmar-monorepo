'use client'

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useCallback, useRef } from 'react'

export function useApiClient() {
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
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

    return {
      'Content-Type': 'application/json',
      'X-Clerk-Session-Token': token,
      ...(headers || {}),
    }
  }, [getToken, router])

  const requestJson = useCallback(async <T,>(url: string, options?: RequestInit): Promise<T | null> => {
    const response = await fetch(url, { ...options, headers: await authHeaders(options?.headers) })
    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json') ? await response.json() : null
    if (response.status === 401) {
      router.push('/sign-in')
      return null
    }
    if (!response.ok) throw new Error(data?.error?.message || `No pudimos completar la acción (${response.status}) en ${url}`)
    return data as T
  }, [authHeaders, router])

  return { authHeaders, isLoaded, isSignedIn, requestJson }
}
