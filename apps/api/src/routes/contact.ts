import { Request, Response, Router } from 'express'
import nodemailer from 'nodemailer'
import { createError } from '../middleware/errorHandler'
import { contactSchema, validateRequest } from '../middleware/validation'

const router = Router()

// POST /api/contact
router.post('/', validateRequest(contactSchema), async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body

    // Configure nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })

    // Email options
    const mailOptions = {
      from: email,
      to: process.env.EMAIL_USER,
      subject: `Contacto desde sitio web: ${subject}`,
      html: `
        <h2>Nuevo mensaje de contacto</h2>
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Asunto:</strong> ${subject}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    }

    // Send email
    await transporter.sendMail(mailOptions)

    res.status(200).json({
      success: true,
      message: 'Mensaje enviado correctamente'
    })
  } catch (error) {
    console.error('Error sending email:', error)
    throw createError('Error al enviar el mensaje', 500)
  }
})

export default router
