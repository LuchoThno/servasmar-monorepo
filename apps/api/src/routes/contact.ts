import { Request, Response, Router } from 'express'
import { Resend } from 'resend'
import { z } from 'zod'
import { buildEmailLayout, escapeHtml } from '../services/email'

const router = Router()
const servasmarFromEmail = 'SERVASMAR <contacto@servasmar.cl>'

const contactSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('El email no es válido'),
  phone: z.string().optional(),
  company: z.string().optional(),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
})

const getMailFrom = () => servasmarFromEmail

const getContactEmail = () => {
  const contactEmail = process.env.CONTACT_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL

  if (!contactEmail) {
    throw new Error('CONTACT_EMAIL no configurado')
  }

  return contactEmail
}

router.post('/', async (req: Request, res: Response, next) => {
  try {
    const { name, email, phone, company, message } = contactSchema.parse(req.body)

    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY no configurado')
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = getMailFrom()

    const internalEmail = await resend.emails.send({
      from,
      to: getContactEmail(),
      replyTo: email,
      subject: `Nueva consulta web - ${name}`,
      html: buildEmailLayout(
        'Nueva consulta web',
        `<p>Recibiste una nueva consulta desde el formulario de contacto de SERVASMAR.</p>
         <ul>
           <li><strong>Nombre:</strong> ${escapeHtml(name)}</li>
           <li><strong>Email:</strong> ${escapeHtml(email)}</li>
           ${phone ? `<li><strong>Telefono:</strong> ${escapeHtml(phone)}</li>` : ''}
           ${company ? `<li><strong>Empresa:</strong> ${escapeHtml(company)}</li>` : ''}
         </ul>
         <p><strong>Mensaje:</strong></p>
         <p>${escapeHtml(message)}</p>`
      ),
    })

    if (internalEmail.error) {
      console.error('Resend contact error:', internalEmail.error)
      return res.status(500).json({
        success: false,
        error: { message: 'Error al enviar el mensaje' },
      })
    }

    const replyEmail = await resend.emails.send({
      from,
      to: email,
      subject: 'Recibimos tu solicitud - Servasmar',
      html: buildEmailLayout(
        'Solicitud recibida',
        `<p>Hola ${escapeHtml(name)}, recibimos correctamente tu solicitud.</p>
         <p>Nuestro equipo revisara tu mensaje y nos contactaremos contigo a la brevedad para orientarte sobre los proximos pasos.</p>
         <p>Gracias por contactar a SERVASMAR.</p>`
      ),
    })

    if (replyEmail.error) {
      console.error('Resend contact auto reply error:', replyEmail.error)
    }

    res.status(200).json({
      success: true,
      message: replyEmail.error
        ? 'Mensaje enviado correctamente. No pudimos enviar la confirmación automática, pero recibimos tu solicitud.'
        : 'Mensaje enviado correctamente. Enviamos una confirmación a tu correo.',
      emailWarning: replyEmail.error ? 'No se pudo enviar la confirmación automática.' : undefined,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { message: 'Datos de entrada inválidos' },
        details: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      })
    }

    next(error)
  }
})

export default router
