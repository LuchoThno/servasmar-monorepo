import { createHash } from 'crypto'
import { connectToDatabase } from '../../../../../api/src/config/db'
import { PublicRateLimitModel } from '../../../../../api/src/models/PublicRateLimit'
import { createError } from './apiError'

type RateLimitOptions = {
  scope: string
  limit: number
  windowMs: number
}

const turnstileVerifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export const getRequestIp = (req: Request) => {
  const forwarded = req.headers.get('x-forwarded-for') || ''
  const realIp = req.headers.get('x-real-ip') || ''
  return forwarded.split(',')[0]?.trim() || realIp.trim() || 'unknown'
}

const hashIdentifier = (value: string) => createHash('sha256').update(value).digest('hex')

export async function enforcePublicRateLimit(req: Request, options: RateLimitOptions) {
  const ip = getRequestIp(req)
  const now = Date.now()
  const bucket = Math.floor(now / options.windowMs)
  const key = `${options.scope}:${hashIdentifier(ip)}:${bucket}`

  await connectToDatabase()
  const entry = await PublicRateLimitModel.findOneAndUpdate(
    { key },
    {
      $setOnInsert: {
        key,
        scope: options.scope,
        identifierHash: hashIdentifier(ip),
        expiresAt: new Date((bucket + 1) * options.windowMs),
      },
      $inc: { count: 1 },
    },
    { upsert: true, new: true }
  ).lean()

  if ((entry?.count || 0) > options.limit) {
    throw createError('Demasiadas solicitudes. Espera unos minutos antes de intentarlo nuevamente.', 429)
  }
}

export async function verifyTurnstileToken(token: string | undefined, req: Request) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) return

  const challengeToken = (token || '').trim()
  if (!challengeToken) {
    throw createError('Confirma la verificación de seguridad antes de enviar el formulario.', 400)
  }

  const body = new URLSearchParams({
    secret,
    response: challengeToken,
  })
  const remoteIp = getRequestIp(req)
  if (remoteIp && remoteIp !== 'unknown') {
    body.set('remoteip', remoteIp)
  }

  const response = await fetch(turnstileVerifyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    throw createError('No pudimos validar la verificación de seguridad. Intenta nuevamente.', 502)
  }

  const data = (await response.json()) as { success?: boolean }
  if (!data.success) {
    throw createError('La verificación de seguridad no fue válida. Intenta nuevamente.', 400)
  }
}
