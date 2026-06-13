'use client'

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export function useApiClient() {
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const authHeaders = useCallback(async (headers?: HeadersInit) => {
    const token = await getToken()
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
    const data = await response.json()
    if (response.status === 401 || response.status === 403) {
      router.push('/sign-in')
      return null
    }
    if (!response.ok) throw new Error(data?.error?.message || 'No pudimos completar la acción')
    return data as T
  }, [authHeaders, router])

  return { authHeaders, isLoaded, isSignedIn, requestJson }
}
