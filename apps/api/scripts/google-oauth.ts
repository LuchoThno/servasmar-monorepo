import dotenv from 'dotenv'
import { google } from 'googleapis'
import path from 'node:path'

const envPath = path.basename(process.cwd()) === 'api' ? '.env' : 'apps/api/.env'
dotenv.config({ path: envPath })

const scopes = ['https://www.googleapis.com/auth/calendar.events']
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost'
const clientId = process.env.GOOGLE_CLIENT_ID
const clientSecret = process.env.GOOGLE_CLIENT_SECRET

const args = process.argv.slice(2)
const codeArg = args.find((arg) => arg.startsWith('--code='))
const code = codeArg?.replace('--code=', '')

if (!clientId || !clientSecret || clientId.startsWith('your-') || clientSecret.startsWith('your-')) {
  console.error('Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en apps/api/.env antes de ejecutar este script.')
  process.exit(1)
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

if (!code) {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  })

  console.log('Abre esta URL con la cuenta que administrará el calendario:')
  console.log(url)
  console.log('\nLuego ejecuta:')
  console.log('npm run google:auth -w @servasmar/api -- --code=CODIGO_DE_GOOGLE')
  process.exit(0)
}

oauth2Client.getToken(code)
  .then(({ tokens }) => {
    if (!tokens.refresh_token) {
      console.log('Google no devolvió refresh_token. Revoca el acceso de la app y vuelve a ejecutar con prompt=consent.')
      console.log('Tokens recibidos:', tokens)
      return
    }

    console.log('Agrega este valor a apps/api/.env y a Vercel:')
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
  })
  .catch((error) => {
    console.error('No se pudo obtener el token de Google:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
