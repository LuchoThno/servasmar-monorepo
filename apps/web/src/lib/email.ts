import { Resend } from 'resend'

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>')

const getMailFrom = () => {
  const from = process.env.MAIL_FROM || process.env.RESEND_FROM_EMAIL

  if (!from) {
    throw new Error('MAIL_FROM o RESEND_FROM_EMAIL no configurado')
  }

  return from
}

export async function enviarCorreoCita(data: {
  nombre: string
  email: string
  fecha: string
  hora: string
  meetLink: string
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no configurado')
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  return resend.emails.send({
    from: getMailFrom(),
    to: data.email,
    subject: 'Reunión confirmada - Servasmar',
    html: `
      <h2>Reunión confirmada</h2>
      <p>Hola ${escapeHtml(data.nombre)}, tu reunión fue confirmada.</p>
      <p><strong>Fecha:</strong> ${escapeHtml(data.fecha)}</p>
      <p><strong>Hora:</strong> ${escapeHtml(data.hora)}</p>
      <p><strong>Meet:</strong> <a href="${escapeHtml(data.meetLink)}">${escapeHtml(data.meetLink)}</a></p>
    `,
  })
}

export async function enviarCorreoSolicitudRecibida(data: {
  nombre: string
  email: string
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no configurado')
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  return resend.emails.send({
    from: getMailFrom(),
    to: data.email,
    subject: 'Solicitud de reunión recibida - Servasmar',
    html: `
      <h2>Solicitud recibida</h2>
      <p>Hola ${escapeHtml(data.nombre)}, recibimos tu solicitud de reunión.</p>
      <p>Nuestro equipo revisará la disponibilidad y te responderá pronto.</p>
    `,
  })
}
