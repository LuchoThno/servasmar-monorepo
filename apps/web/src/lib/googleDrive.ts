import { Readable } from 'stream'
import { google, drive_v3 } from 'googleapis'

const driveScope = 'https://www.googleapis.com/auth/drive'
const folderMimeType = 'application/vnd.google-apps.folder'

let driveClient: drive_v3.Drive | null = null

const escapeDriveQueryValue = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

const getDriveClient = () => {
  if (driveClient) return driveClient

  const serviceAccountJson = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (serviceAccountJson) {
    const credentials = JSON.parse(serviceAccountJson)
    const auth = new google.auth.GoogleAuth({ credentials, scopes: [driveScope] })
    driveClient = google.drive({ version: 'v3', auth })
    return driveClient
  }

  if (clientEmail && privateKey) {
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey },
      scopes: [driveScope],
    })
    driveClient = google.drive({ version: 'v3', auth })
    return driveClient
  }

  if (process.env.NODE_ENV !== 'production') {
    const auth = new google.auth.GoogleAuth({ scopes: [driveScope] })
    driveClient = google.drive({ version: 'v3', auth })
    return driveClient
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (clientId && clientSecret && refreshToken) {
    const auth = new google.auth.OAuth2(clientId, clientSecret)
    auth.setCredentials({ refresh_token: refreshToken })
    driveClient = google.drive({ version: 'v3', auth })
    return driveClient
  }

  throw new Error('Google Drive no configurado. Define GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON o credenciales OAuth con scope de Drive.')
}

const getRootFolderId = () => {
  const folderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  if (!folderId) throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID no configurado')
  return folderId
}

const findFolder = async (name: string, parentId: string) => {
  const drive = getDriveClient()
  const query = [
    `name = '${escapeDriveQueryValue(name)}'`,
    `mimeType = '${folderMimeType}'`,
    `'${escapeDriveQueryValue(parentId)}' in parents`,
    'trashed = false',
  ].join(' and ')

  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })

  return response.data.files?.[0]?.id || null
}

export const ensureDriveFolder = async (name: string, parentId = getRootFolderId()) => {
  const existingFolderId = await findFolder(name, parentId)
  if (existingFolderId) return existingFolderId

  const drive = getDriveClient()
  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: folderMimeType,
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  })

  if (!response.data.id) throw new Error(`No se pudo crear carpeta en Drive: ${name}`)
  return response.data.id
}

export const uploadDriveFile = async ({
  buffer,
  name,
  mimeType,
  folderId,
}: {
  buffer: Buffer
  name: string
  mimeType: string
  folderId: string
}) => {
  const drive = getDriveClient()
  const response = await drive.files.create({
    requestBody: {
      name,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id, name, mimeType, size, webViewLink, webContentLink',
    supportsAllDrives: true,
  })

  if (!response.data.id) throw new Error(`No se pudo subir archivo a Drive: ${name}`)
  return response.data
}

export const downloadDriveFile = async (fileId: string) => {
  const drive = getDriveClient()
  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  )

  return Buffer.from(response.data as ArrayBuffer)
}
