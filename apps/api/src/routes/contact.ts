import { NextFunction, Request, Response, Router } from 'express'
import { Resend } from 'resend'
import { createError } from '../middleware/errorHandler'
import { contactSchema, validateRequest } from '../middleware/validation'

const router = Router()

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>')

// POST /api/contact
router.post('/', validateRequest(contactSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, company, message } = req.body
    const subject = 'Solicitud de consulta'
    const resendApiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM_EMAIL
    const contactEmail = process.env.CONTACT_EMAIL

    if (!resendApiKey || !fromEmail || !contactEmail) {
      throw createError('Configuración de correo incompleta', 500)
    }

    const resend = new Resend(resendApiKey)

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [contactEmail],
      replyTo: email,
      subject: `Contacto desde sitio web: ${subject}`,
      html: `
        <h2>Nuevo mensaje de contacto</h2>
        <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        ${phone ? `<p><strong>Teléfono:</strong> ${escapeHtml(phone)}</p>` : ''}
        ${company ? `<p><strong>Empresa:</strong> ${escapeHtml(company)}</p>` : ''}
        <p><strong>Asunto:</strong> ${subject}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${escapeHtml(message)}</p>
      `
    })

    if (error) {
      console.error('Resend error:', error)
      throw createError('Error al enviar el mensaje', 500)
    }

    res.status(200).json({
      success: true,
      message: 'Mensaje enviado correctamente'
    })
  } catch (error) {
    console.error('Error sending email:', error)
    next(error instanceof Error ? error : createError('Error al enviar el mensaje', 500))
  }
})

export default router
