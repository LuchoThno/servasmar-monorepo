import { NextRequest } from 'next/server'
import { z } from 'zod'

import { enviarCorreoContacto, enviarCorreoRespuestaContacto } from '@/lib/email'
import { createError, toErrorResponse } from '../_lib/apiError'

const contactSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('El email no es válido'),
  phone: z.string().optional(),
  company: z.string().optional(),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
})

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, company, message } = contactSchema.parse(await req.json())

    const { error } = await enviarCorreoContacto({
      nombre: name,
      email,
      telefono: phone,
      empresa: company,
      mensaje: message,
    })

    if (error) {
      console.error('Resend error:', error)
      throw createError('Error al enviar el mensaje', 500)
    }

    const { error: replyError } = await enviarCorreoRespuestaContacto({
      nombre: name,
      email,
    })

    if (replyError) {
      console.error('Resend auto reply error:', replyError)
    }

    return Response.json({
      success: true,
      message: replyError
        ? 'Mensaje enviado correctamente. No pudimos enviar la confirmación automática, pero recibimos tu solicitud.'
        : 'Mensaje enviado correctamente. Enviamos una confirmación a tu correo.',
      emailWarning: replyError ? 'No se pudo enviar la confirmación automática.' : undefined,
    })
  } catch (err) {
    return err instanceof z.ZodError ? toErrorResponse(createError('Datos de entrada inválidos', 400)) : toErrorResponse(err)
  }
}
