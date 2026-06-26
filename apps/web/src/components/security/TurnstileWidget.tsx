'use client'

import Script from 'next/script'
import { useEffect, useId, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId?: string) => void
      remove?: (widgetId?: string) => void
    }
  }
}

type TurnstileWidgetProps = {
  onTokenChange: (token: string) => void
  onExpired?: () => void
}

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || ''

export function TurnstileWidget({ onTokenChange, onExpired }: TurnstileWidgetProps) {
  const id = useId().replace(/:/g, '')
  const containerId = `turnstile-${id}`
  const widgetIdRef = useRef<string | null>(null)
  const renderedRef = useRef(false)

  useEffect(() => {
    if (!siteKey || renderedRef.current || !window.turnstile) return

    widgetIdRef.current = window.turnstile.render(`#${containerId}`, {
      sitekey: siteKey,
      callback: (token: string) => onTokenChange(token),
      'expired-callback': () => {
        onTokenChange('')
        onExpired?.()
      },
      'error-callback': () => {
        onTokenChange('')
      },
      theme: 'light',
    })
    renderedRef.current = true
  }, [containerId, onExpired, onTokenChange])

  if (!siteKey) return null

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div id={containerId} className="min-h-[65px]" />
    </>
  )
}
