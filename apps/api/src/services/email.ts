import { Resend } from 'resend'
import { EmailLogModel } from '../models/EmailLog'

const servasmarFromEmail = 'SERVASMAR <contacto@servasmar.cl>'

type SendEmailInput = {
  to: string
  subject: string
  html: string
  template: string
  appointmentId?: string
}

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>')

export const buildEmailLayout = (title: string, content: string) => `
  <div style="background:#f8fafc;padding:32px;font-family:Arial,sans-serif;color:#0f172a">
    <div style="max-width:640px;margin:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <div style="background:#1d4ed8;color:#ffffff;padding:24px">
        <h1 style="margin:0;font-size:22px">SERVASMAR</h1>
        <p style="margin:6px 0 0;font-size:14px">Gestión de reuniones empresariales</p>
      </div>
      <div style="padding:28px">
        <h2 style="margin-top:0;color:#0f172a">${escapeHtml(title)}</h2>
        ${content}
      </div>
      <div style="padding:18px 28px;background:#f1f5f9;color:#475569;font-size:12px">
        Este mensaje fue generado automáticamente por la plataforma de agendamiento de SERVASMAR.
      </div>
    </div>
  </div>
`

export const sendEmail = async ({ to, subject, html, template, appointmentId }: SendEmailInput) => {
  const apiKey = process.env.RESEND_API_KEY
  const from = servasmarFromEmail

  if (!apiKey) {
    throw new Error('Configuración de Resend incompleta')
  }

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
  })

  await EmailLogModel.create({
    appointmentId,
    to,
    subject,
    template,
    status: error ? 'failed' : 'sent',
    providerMessageId: data?.id,
    error: error ? JSON.stringify(error) : undefined,
  })

  if (error) {
    throw new Error('Resend no pudo enviar el correo')
  }

  return data
}

export const appointmentReceivedTemplate = (name: string) =>
  buildEmailLayout(
    'Solicitud recibida',
    `<p>Hola ${escapeHtml(name)}, recibimos tu solicitud de reunión.</p>
     <p>Nuestro equipo revisará la disponibilidad y te responderá pronto.</p>`
  )

export const appointmentApprovedTemplate = (params: {
  name: string
  company: string
  date: string
  time: string
  reason: string
  meetLink: string
}) =>
  buildEmailLayout(
    `Reunión confirmada con ${params.company}`,
    `<p>Hola ${escapeHtml(params.name)}, tu reunión fue confirmada.</p>
     <ul>
       <li><strong>Fecha:</strong> ${escapeHtml(params.date)}</li>
       <li><strong>Hora:</strong> ${escapeHtml(params.time)}</li>
       <li><strong>Motivo:</strong> ${escapeHtml(params.reason)}</li>
     </ul>
     <p><a href="${escapeHtml(params.meetLink)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:12px 18px;border-radius:6px;text-decoration:none">Entrar a Google Meet</a></p>
     <p>Gracias por contactarte con SERVASMAR. Te esperamos en la reunión.</p>`
  )

export const appointmentRejectedTemplate = (params: { name: string; reason: string }) =>
  buildEmailLayout(
    'Solicitud de reunión no disponible',
    `<p>Hola ${escapeHtml(params.name)}, lamentablemente no podremos confirmar tu solicitud en el horario indicado.</p>
     <p><strong>Motivo:</strong> ${escapeHtml(params.reason || 'Disponibilidad no confirmada')}</p>
     <p>Te invitamos a enviar una nueva solicitud con otra fecha u horario.</p>`
  )
