<div align="center">

# ⚓ Servasmar WEB Corporativa

**Plataforma web de asesorías y soluciones marítimas, portuarias y costeras**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4-green?style=flat-square&logo=express)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js)](https://nodejs.org/)

</div>

---

## 📌 Descripción

Repositorio monorepo que contiene el sitio web y los servicios internos de **Servasmar**. Organizado con `npm workspaces`, incluye una aplicación web en Next.js, una API en Express y paquetes compartidos de UI y utilidades.

Los servicios que presenta la plataforma incluyen:

- 🏛️ Tramitación de concesiones marítimas
- 🌿 Gestión de permisos ambientales
- 🏗️ Asesoría en proyectos portuarios
- ⚖️ Consultoría legal marítima
- 📋 Auditorías y gestión portuaria integral

---

## 📁 Estructura

```
servasmar-monorepo/
├── apps/
│   ├── web/          # Aplicación web (Next.js)
│   └── api/          # API REST (Express)
├── packages/
│   ├── ui/           # Componentes UI compartidos (@servasmar/ui)
│   └── utils/        # Utilidades compartidas (@servasmar/utils)
├── package.json
└── tsconfig.json
```

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework web | Next.js + React |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS |
| Backend | Express |
| Validación | Zod |
| Iconos | Lucide React |
| Gestor de paquetes | npm workspaces |

---

## ⚙️ Requisitos

- **Node.js** `>= 20`
- **npm** `>= 10`

---

## 🚀 Instalación

Clonar el repositorio e instalar todas las dependencias del monorepo:

```bash
git clone https://github.com/tu-usuario/servasmar-monorepo.git
cd servasmar-monorepo
npm install
```

---

## 💻 Desarrollo

Levantar la aplicación web:

```bash
npm run dev
```

Levantar la API:

```bash
npm run dev:api
```

> Ambos comandos pueden ejecutarse en paralelo en terminales separadas.

### Plataforma de citas

La plataforma incluye:

- Página pública: `http://localhost:3000/citas`
- Login admin: `http://localhost:3000/admin/login`
- Gestión admin: `http://localhost:3000/admin/citas`

Configura `apps/api/.env` tomando como base `apps/api/.env.example`.

Variables principales:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/servasmar
CLERK_SECRET_KEY=clerk_live_secret_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=clerk_live_publishable_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/admin
CLERK_AUTHORIZED_PARTIES=https://tu-dominio.cl,https://www.tu-dominio.cl
CLERK_JWT_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
CLERK_WEBHOOK_SECRET=whsec_...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GOOGLE_CALENDAR_ID=primary
GOOGLE_REDIRECT_URI=http://localhost
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="SERVASMAR <servasmar.thno@gmail.com>"
CONTACT_EMAIL=servasmar.thno@gmail.com
```

En producción, usa las claves live del entorno productivo de Clerk. El registro público está cerrado: `/sign-up` redirige a `/sign-in`, y la API solo autoriza usuarios cuyo `clerkId` ya exista en la colección de admins (`clerkId` o `clerkIds`). Los usuarios nuevos deben crearse desde el módulo admin de usuarios para quedar inscritos antes de ingresar.

Checklist Clerk producción:

- Configura `CLERK_AUTHORIZED_PARTIES` con los orígenes exactos del sitio en producción, incluyendo `https://`.
- Configura `CLERK_JWT_KEY` con la public key PEM de Clerk para verificar tokens localmente. En `.env`, conserva los saltos como `\n`.
- Actualiza el endpoint del webhook en Clerk para apuntar al dominio productivo y guarda su signing secret en `CLERK_WEBHOOK_SECRET`.
- Si usas login social, reemplaza las credenciales OAuth compartidas de desarrollo por credenciales propias de producción.
- Completa los registros DNS requeridos en Clerk Domains y despliega certificados cuando el dashboard lo habilite.
- Después de cambiar variables en el hosting, redepliega la app.

#### Google Calendar API

1. Crea un proyecto en Google Cloud.
2. Habilita Google Calendar API.
3. Crea credenciales OAuth Client ID.
4. Autoriza el scope `https://www.googleapis.com/auth/calendar`.
5. Define temporalmente `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI=http://localhost` en `apps/api/.env`.
6. Genera la URL de autorización:

```bash
npm run google:auth -w @servasmar/api
```

7. Abre la URL, autoriza con la cuenta que administra el calendario y copia el parámetro `code` del redirect.
8. Intercambia el código por el refresh token:

```bash
npm run google:auth -w @servasmar/api -- --code=CODIGO_DE_GOOGLE
```

9. Guarda `GOOGLE_REFRESH_TOKEN` en `apps/api/.env` y en las variables de entorno del despliegue.
10. Define `GOOGLE_CALENDAR_ID`; usa `primary` o el ID del calendario empresarial, por ejemplo `95d0f9658fb10720a040e32f72f1670586f3c20d26feb66e2f9f7c7bf31a810d@group.calendar.google.com`.

No uses la URL publica, el embed, ni la direccion secreta iCal (`.ics`) como `GOOGLE_CALENDAR_ID` o `GOOGLE_REFRESH_TOKEN`. La direccion iCal solo sirve para leer/suscribirse al calendario; para crear eventos y enlaces de Meet se necesita OAuth.

El sistema crea eventos con `conferenceData`, lo que genera el enlace de Google Meet.

#### Resend

1. Crea una API key en Resend.
2. Verifica el dominio desde el que enviarás correos.
3. Define `RESEND_API_KEY` y `RESEND_FROM_EMAIL`.
4. Usa `CONTACT_EMAIL` como correo destino para notificaciones internas.

#### Flujo

1. El usuario solicita una cita en `/citas`.
2. La solicitud queda en MongoDB como `pendiente`.
3. El administrador entra a `/admin/citas`.
4. Al aprobar, se crea evento en Google Calendar, se genera Google Meet y se envía correo por Resend.
5. Al rechazar, se guarda el motivo y se envía correo informativo.
6. El panel permite filtrar, ver historial y exportar citas a CSV.

---

## 📜 Scripts Disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Aplicación web en modo desarrollo |
| `npm run dev:api` | API en modo desarrollo |
| `npm run build` | Compila paquetes y la web para producción |
| `npm run lint` | Ejecuta el linter en la web |
| `npm run type-check` | Verifica tipos TypeScript en la web |

---

## 📦 Aplicaciones

### `apps/web` — Sitio Web

Aplicación principal construida con **Next.js**. Presenta los servicios marítimos de Servasmar, información corporativa y canales de contacto.

### `apps/api` — API REST

Servicio backend construido con **Express** y **TypeScript**. Incluye seguridad, validación con Zod, autenticación, envío de correos y manejo de archivos.

---

## 🧩 Paquetes Compartidos

### `@servasmar/ui`

Componentes visuales reutilizables para mantener consistencia entre las aplicaciones del monorepo.

### `@servasmar/utils`

Lógica y utilidades comunes compartidas entre proyectos.

---

## 🏭 Producción

Compilar todos los paquetes y la aplicación web:

```bash
npm run build
```

Iniciar la aplicación web compilada:

```bash
npm run start -w @servasmar/web
```

---

## 🤝 Contribución

1. Crea un branch desde `main`: `git checkout -b feature/nombre`
2. Realiza tus cambios y verifica tipos: `npm run type-check`
3. Asegúrate de que el lint pase: `npm run lint`
4. Abre un Pull Request describiendo los cambios

---

<div align="center">

Desarrollado para **Servasmar** — Soluciones marítimas, portuarias y costeras

</div>
