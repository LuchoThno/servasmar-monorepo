import { Resend } from 'resend'

const servasmarFromEmail = 'SERVASMAR <contacto@servasmar.cl>'

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>')

const getMailFrom = () => servasmarFromEmail

const getSiteUrl = () => {
  const url = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://servasmar.cl'
  return url.replace(/\/$/, '')
}

const buildEmailLayout = ({
  title,
  preview,
  children,
}: {
  title: string
  preview: string
  children: string
}) => {
  const siteUrl = getSiteUrl()
  const logoUrl = `${siteUrl}/images/logo2.png`

  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
      ${escapeHtml(preview)}
    </div>
    <div style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#eef2f7">
        <tr>
          <td align="center" style="padding:32px 16px">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;background:#ffffff;border:1px solid #dbe3ee;border-radius:12px;overflow:hidden">
              <tr>
                <td style="background:#0f2742;padding:28px 32px">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
                    <tr>
                      <td style="width:72px;vertical-align:middle">
                        <img src="${logoUrl}" alt="SERVASMAR" width="56" height="56" style="display:block;border-radius:10px;background:#ffffff;object-fit:contain">
                      </td>
                      <td style="vertical-align:middle">
                        <p style="margin:0;color:#7dd3fc;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">SERVASMAR</p>
                        <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;line-height:1.25;font-weight:700">${escapeHtml(title)}</h1>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:30px 32px">
                  ${children}
                </td>
              </tr>
              <tr>
                <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
                  <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6">
                    Este correo fue enviado automaticamente por SERVASMAR. Si no solicitaste esta reunion, responde este mensaje para que podamos revisarlo.
                  </p>
                  <p style="margin:10px 0 0;color:#64748b;font-size:12px;line-height:1.6">
                    <a href="${siteUrl}" style="color:#1d4ed8;text-decoration:none;font-weight:700">servasmar.cl</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `
}

const detailRow = (label: string, value: string) => `
  <tr>
    <td style="padding:12px 0;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0">${escapeHtml(label)}</td>
    <td align="right" style="padding:12px 0;color:#0f172a;font-size:14px;font-weight:700;border-bottom:1px solid #e2e8f0">${escapeHtml(value)}</td>
  </tr>
`

export async function enviarCorreoCita(data: {
  recipients: Array<{ name: string; email: string }>
  empresa: string
  motivo: string
  fecha: string
  hora: string
  meetLink: string
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no configurado')
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const failed: string[] = []

  await Promise.all(
    data.recipients.map(async (recipient) => {
      try {
        await resend.emails.send({
          from: getMailFrom(),
          to: recipient.email,
          subject: 'Reunión confirmada - Servasmar',
          html: buildEmailLayout({
            title: 'Reunion confirmada',
            preview: `La reunion SERVASMAR fue confirmada para el ${data.fecha} a las ${data.hora}.`,
            children: `
              <p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.7">
                Hola <strong>${escapeHtml(recipient.name)}</strong>, la reunion con SERVASMAR fue confirmada.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:22px 0">
                ${detailRow('Empresa', data.empresa)}
                ${detailRow('Fecha', data.fecha)}
                ${detailRow('Hora', data.hora)}
                ${detailRow('Motivo', data.motivo)}
              </table>
              <p style="margin:24px 0 0">
                <a href="${escapeHtml(data.meetLink)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 20px;border-radius:8px">
                  Entrar a Google Meet
                </a>
              </p>
              <p style="margin:18px 0 0;color:#64748b;font-size:13px;line-height:1.6">
                Enlace directo: <a href="${escapeHtml(data.meetLink)}" style="color:#1d4ed8;text-decoration:none">${escapeHtml(data.meetLink)}</a>
              </p>
            `,
          }),
        })
      } catch {
        failed.push(recipient.email)
      }
    })
  )

  if (failed.length) {
    throw new Error(`No pudimos enviar el correo a: ${failed.join(', ')}`)
  }
}

export async function enviarCorreoReagendacionCita(data: {
  recipients: Array<{ name: string; email: string }>
  empresa: string
  motivo: string
  reason: string
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no configurado')
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const failed: string[] = []

  await Promise.all(
    data.recipients.map(async (recipient) => {
      try {
        await resend.emails.send({
          from: getMailFrom(),
          to: recipient.email,
          subject: 'Necesitamos reagendar tu reunión - Servasmar',
          html: buildEmailLayout({
            title: 'Reagendemos la reunion',
            preview: 'Necesitamos coordinar un nuevo horario para tu reunion con SERVASMAR.',
            children: `
              <p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.7">
                Hola <strong>${escapeHtml(recipient.name)}</strong>, necesitamos reagendar la reunion con SERVASMAR.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:22px 0">
                ${detailRow('Empresa', data.empresa)}
                ${detailRow('Motivo de la reunion', data.motivo)}
                ${detailRow('Contexto', data.reason)}
              </table>
              <div style="margin:22px 0;padding:18px 20px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px">
                <p style="margin:0;color:#1e3a8a;font-size:14px;line-height:1.7">
                  Nuestro equipo revisara una nueva alternativa y se pondra en contacto para confirmar otro horario disponible.
                </p>
              </div>
              <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6">
                Gracias por tu flexibilidad. Queremos asegurar una reunion bien coordinada para atenderte correctamente.
              </p>
            `,
          }),
        })
      } catch {
        failed.push(recipient.email)
      }
    })
  )

  if (failed.length) {
    throw new Error(`No pudimos enviar el correo a: ${failed.join(', ')}`)
  }
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
    html: buildEmailLayout({
      title: 'Solicitud recibida',
      preview: 'Recibimos tu solicitud de reunion y la revisaremos pronto.',
      children: `
        <p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.7">
          Hola <strong>${escapeHtml(data.nombre)}</strong>, recibimos tu solicitud de reunion.
        </p>
        <div style="margin:22px 0;padding:18px 20px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px">
          <p style="margin:0;color:#1e3a8a;font-size:14px;line-height:1.7">
            Nuestro equipo revisara la disponibilidad y te respondera con la confirmacion o una alternativa de horario.
          </p>
        </div>
        <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6">
          Gracias por contactar a SERVASMAR. Te mantendremos informado por este mismo correo.
        </p>
      `,
    }),
  })
}

export async function enviarCorreoNuevaSolicitudCorporativa(data: {
  nombre: string
  email: string
  telefono: string
  empresa: string
  motivo: string
  fechaSolicitada: string
  horaSolicitada: string
  observaciones?: string
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no configurado')
  }

  const contactEmail = process.env.CONTACT_EMAIL
  if (!contactEmail) {
    throw new Error('CONTACT_EMAIL no configurado')
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  return resend.emails.send({
    from: getMailFrom(),
    to: contactEmail,
    replyTo: data.email,
    subject: `Nueva solicitud de cita - ${data.empresa}`,
    html: buildEmailLayout({
      title: 'Nueva solicitud de cita',
      preview: `${data.nombre} solicitó una reunión desde servasmar.cl.`,
      children: `
        <p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.7">
          Se registró una nueva solicitud de reunión desde el formulario público.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:22px 0">
          ${detailRow('Nombre', data.nombre)}
          ${detailRow('Correo', data.email)}
          ${detailRow('Teléfono', data.telefono)}
          ${detailRow('Empresa', data.empresa)}
          ${detailRow('Motivo', data.motivo)}
          ${detailRow('Fecha solicitada', data.fechaSolicitada)}
          ${detailRow('Hora solicitada', data.horaSolicitada)}
        </table>
        ${data.observaciones ? `
          <div style="margin:22px 0;padding:18px 20px;background:#f8fafc;border:1px solid #dbe3ee;border-radius:10px">
            <p style="margin:0 0 8px;color:#0f172a;font-size:13px;font-weight:700">Observaciones</p>
            <p style="margin:0;color:#475569;font-size:14px;line-height:1.7">${escapeHtml(data.observaciones)}</p>
          </div>
        ` : ''}
      `,
    }),
  })
}

export async function enviarCorreoContacto(data: {
  nombre: string
  email: string
  telefono?: string
  empresa?: string
  mensaje: string
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no configurado')
  }

  const contactEmail = process.env.CONTACT_EMAIL
  if (!contactEmail) {
    throw new Error('CONTACT_EMAIL no configurado')
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  return resend.emails.send({
    from: getMailFrom(),
    to: contactEmail,
    replyTo: data.email,
    subject: `Nueva consulta web - ${data.nombre}`,
    html: buildEmailLayout({
      title: 'Nueva consulta web',
      preview: `${data.nombre} envio una consulta desde servasmar.cl.`,
      children: `
        <p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.7">
          Recibiste una nueva consulta desde el formulario de contacto de SERVASMAR.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:22px 0">
          ${detailRow('Nombre', data.nombre)}
          ${detailRow('Email', data.email)}
          ${data.telefono ? detailRow('Telefono', data.telefono) : ''}
          ${data.empresa ? detailRow('Empresa', data.empresa) : ''}
        </table>
        <div style="margin:22px 0;padding:18px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">
          <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Mensaje</p>
          <p style="margin:0;color:#0f172a;font-size:15px;line-height:1.7">${escapeHtml(data.mensaje)}</p>
        </div>
        <p style="margin:18px 0 0;color:#64748b;font-size:13px;line-height:1.6">
          Puedes responder directamente este correo para contactar a ${escapeHtml(data.nombre)}.
        </p>
      `,
    }),
  })
}

export async function enviarCorreoRespuestaContacto(data: {
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
    subject: 'Recibimos tu solicitud - Servasmar',
    html: buildEmailLayout({
      title: 'Solicitud recibida',
      preview: 'Recibimos tu solicitud y nos contactaremos contigo pronto.',
      children: `
        <p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.7">
          Hola <strong>${escapeHtml(data.nombre)}</strong>, recibimos correctamente tu solicitud.
        </p>
        <div style="margin:22px 0;padding:18px 20px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px">
          <p style="margin:0;color:#1e3a8a;font-size:14px;line-height:1.7">
            Nuestro equipo revisara tu mensaje y nos contactaremos contigo a la brevedad para orientarte sobre los proximos pasos.
          </p>
        </div>
        <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6">
          Gracias por contactar a SERVASMAR.
        </p>
      `,
    }),
  })
}
