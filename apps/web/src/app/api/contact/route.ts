import { NextRequest } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'

import { createError, toErrorResponse } from '../_lib/apiError'

const contactSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('El email no es válido'),
  phone: z.string().optional(),
  company: z.string().optional(),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
})

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>')

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, company, message } = contactSchema.parse(await req.json())
    const resendApiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.MAIL_FROM || process.env.RESEND_FROM_EMAIL
    const contactEmail = process.env.CONTACT_EMAIL

    if (!resendApiKey || !fromEmail || !contactEmail) {
      throw createError('Configuración de correo incompleta', 500)
    }

    const resend = new Resend(resendApiKey)
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [contactEmail],
      replyTo: email,
      subject: 'Contacto desde sitio web: Solicitud de consulta',
      html: `
        <h2>Nuevo mensaje de contacto</h2>
        <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        ${phone ? `<p><strong>Teléfono:</strong> ${escapeHtml(phone)}</p>` : ''}
        ${company ? `<p><strong>Empresa:</strong> ${escapeHtml(company)}</p>` : ''}
        <p><strong>Asunto:</strong> Solicitud de consulta</p>
        <p><strong>Mensaje:</strong></p>
        <p>${escapeHtml(message)}</p>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      throw createError('Error al enviar el mensaje', 500)
    }

    return Response.json({ success: true, message: 'Mensaje enviado correctamente' })
  } catch (err) {
    return err instanceof z.ZodError ? toErrorResponse(createError('Datos de entrada inválidos', 400)) : toErrorResponse(err)
  }
}
