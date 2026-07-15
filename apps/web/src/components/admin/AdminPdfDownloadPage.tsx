'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { downloadFileResponse } from '@/lib/downloadFile'
import { useApiClient } from '@/lib/useApiClient'

export function AdminPdfDownloadPage({
  endpoint,
  fallbackFilename,
  backHref,
  title,
}: {
  endpoint: string
  fallbackFilename: string
  backHref: string
  title: string
}) {
  const { authorizedFetch, isLoaded, isSignedIn } = useApiClient()
  const [message, setMessage] = useState('Preparando descarga...')

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false

    const run = async () => {
      try {
        const response = await authorizedFetch(endpoint)
        if (cancelled) return
        await downloadFileResponse(response, fallbackFilename)
        if (cancelled) return
        setMessage('Descarga iniciada correctamente.')
      } catch (error) {
        if (cancelled) return
        setMessage(error instanceof Error ? error.message : 'No pudimos iniciar la descarga.')
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [authorizedFetch, endpoint, fallbackFilename, isLoaded, isSignedIn])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-10">
      <div className="max-w-lg text-center text-slate-800">
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-3 text-sm text-slate-600">{message}</p>
        <Link href={backHref} className="mt-5 inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white">
          Volver al módulo
        </Link>
      </div>
    </main>
  )
}
