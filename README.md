# Servasmar Monorepo

Plataforma web y administrativa para Servasmar, enfocada en gestion de servicios maritimos, proyectos, citas, clientes, cotizaciones y antecedentes documentales.

El repositorio esta organizado como monorepo con `npm workspaces`. Incluye una aplicacion web en Next.js, una API Express y paquetes compartidos de UI/utilidades.

## Contenido

- Sitio publico corporativo de Servasmar.
- Formulario de contacto con envio por correo.
- Agenda publica de citas y panel administrativo para aprobar/rechazar solicitudes.
- CRM administrativo para clientes, proyectos y cotizaciones.
- Modulo operativo de proyectos y tareas.
- Adjuntos de tareas sincronizados con Google Drive.
- Generacion de PDF para cotizaciones.
- Autenticacion y permisos administrativos con Clerk.

## Stack

| Capa | Tecnologia |
| --- | --- |
| Web | Next.js, React, TypeScript |
| UI | Tailwind CSS, Lucide React |
| API | Express, Next.js Route Handlers |
| Datos | MongoDB, Mongoose |
| Auth | Clerk |
| Email | Resend |
| Google | Calendar API, Drive API |
| Monorepo | npm workspaces |

## Estructura

```txt
servasmar-monorepo/
├── apps/
│   ├── web/              # Aplicacion Next.js principal
│   └── api/              # API Express
├── packages/
│   ├── ui/               # Componentes compartidos
│   └── utils/            # Utilidades compartidas
├── package.json
├── package-lock.json
└── README.md
```

## Modulos Principales

### Sitio Publico

La web publica presenta servicios, historia, contacto y acceso a solicitud de citas.

Rutas principales:

- `/`
- `/citas`
- `/sign-in`

### Panel Administrativo

El panel se encuentra bajo `/admin` y requiere usuario autorizado en Clerk y MongoDB.

Modulos:

- Dashboard CRM
- Clientes
- Proyectos
- Tareas, como submodulo de proyectos
- Cotizaciones
- Citas
- Usuarios administradores

### Proyectos y Google Drive

Al crear un proyecto se crea una carpeta en Google Drive y se guarda su `driveFolderId` en MongoDB.

Los antecedentes que se cargan desde tareas quedan organizados asi:

```txt
Carpeta del proyecto/
└── Antecedentes/
    └── Fecha - Nombre de tarea/
        └── archivo cargado
```

Si un proyecto antiguo no tiene `driveFolderId`, el sistema crea la carpeta automaticamente al subir el primer antecedente y la persiste en MongoDB.

### Citas y Google Calendar

El usuario solicita una cita desde `/citas`. En el panel admin, al aprobarla:

- Se crea un evento en Google Calendar.
- Se genera enlace de Google Meet.
- Se envia correo de confirmacion.

Al rechazarla, se registra el motivo y se envia correo informativo.

### Cotizaciones

El CRM permite crear cotizaciones asociadas a clientes y proyectos, y generar PDF con datos corporativos de Servasmar.

Correo publico usado por la web y PDF:

```txt
contacto@servasmar.cl
```

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- MongoDB
- Cuenta de Clerk
- Cuenta de Resend
- Proyecto de Google Cloud con Calendar API y Drive API habilitadas

## Instalacion

```bash
npm install
```

## Variables de Entorno

La aplicacion web usa `apps/web/.env.local` en desarrollo. En produccion, las variables se configuran en Vercel.

Ejemplo base:

```bash
MONGODB_URI=mongodb+srv://...
MONGODB_DB=servasmar

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
CLERK_WEBHOOK_SECRET=...
CLERK_AUTHORIZED_PARTIES=https://servasmar.cl
CLERK_JWT_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
CLERK_ISSUER=...
CLERK_JWKS_URI=...
CLERK_API_URL=https://api.clerk.com

RESEND_API_KEY=...
RESEND_FROM_EMAIL="SERVASMAR <contacto@servasmar.cl>"
CONTACT_EMAIL=contacto@servasmar.cl
NEXT_PUBLIC_CONTACT_EMAIL=contacto@servasmar.cl

SITE_URL=https://servasmar.cl
NEXT_PUBLIC_SITE_URL=https://servasmar.cl

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GOOGLE_REDIRECT_URI=http://localhost
GOOGLE_CALENDAR_ID=primary
GOOGLE_DRIVE_ROOT_FOLDER_ID=...
```

Notas:

- `GOOGLE_REFRESH_TOKEN` debe generarse con scopes de Calendar y Drive.
- No usar URL publica, embed ni direccion iCal como `GOOGLE_CALENDAR_ID`.
- `GOOGLE_DRIVE_ROOT_FOLDER_ID` define la carpeta raiz donde se crean las carpetas de proyectos.
- En produccion, despues de cambiar variables en Vercel hay que redeplegar.

## Google OAuth

El repo incluye scripts para generar el refresh token.

Generar URL de autorizacion:

```bash
npm run google:auth -w @servasmar/web
```

Intercambiar codigo por refresh token:

```bash
npm run google:auth -w @servasmar/web -- --code=CODIGO_DE_GOOGLE
```

Scopes requeridos:

- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/drive`

## Desarrollo

Levantar la web:

```bash
npm run dev
```

Levantar la API Express:

```bash
npm run dev:api
```

La aplicacion principal corre normalmente en:

```txt
http://localhost:3000
```

## Scripts

| Comando | Descripcion |
| --- | --- |
| `npm run dev` | Inicia la web Next.js |
| `npm run dev:api` | Inicia la API Express |
| `npm run build` | Compila UI y web |
| `npm run type-check` | Verifica TypeScript de la web |
| `npm run lint` | Ejecuta lint de la web |
| `npm run google:auth -w @servasmar/web` | Genera/intercambia credenciales OAuth de Google |

## Verificacion Antes de Subir Cambios

```bash
npm run type-check -w @servasmar/web
npm run build -w @servasmar/web
```

El build puede mostrar un aviso si ESLint no esta instalado localmente. Mientras el proceso termine con codigo `0`, la compilacion es valida.

## Despliegue

El proyecto web esta preparado para Vercel.

Deploy de produccion:

```bash
npx vercel --prod
```

Checklist antes de desplegar:

- Variables de Clerk configuradas.
- `MONGODB_URI` accesible desde Vercel.
- `RESEND_API_KEY` configurada.
- `CONTACT_EMAIL` y `NEXT_PUBLIC_CONTACT_EMAIL` en `contacto@servasmar.cl`.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REFRESH_TOKEN` actualizados.
- Calendar API y Drive API habilitadas en Google Cloud.
- `GOOGLE_DRIVE_ROOT_FOLDER_ID` configurado.

## Flujo Recomendado de Trabajo

1. Crear branch o worktree para la tarea.
2. Implementar cambios acotados.
3. Ejecutar type-check y build.
4. Probar integraciones criticas si hay cambios en Google, correo o MongoDB.
5. Crear commit con mensaje descriptivo.
6. Desplegar en Vercel.
7. Verificar `https://servasmar.cl`.

## Contacto

Servasmar  
Sitio: `https://servasmar.cl`  
Correo: `contacto@servasmar.cl`
