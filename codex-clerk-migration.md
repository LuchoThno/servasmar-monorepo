# Contexto del proyecto — Migración a Clerk

## Stack
- **Framework**: Next.js 14+ con App Router
- **Base de datos**: MongoDB (Mongoose o cliente nativo)
- **Auth actual**: JWT propio almacenado en `localStorage` — en proceso de migración
- **Auth destino**: Clerk (plan gratuito) con Google OAuth y MFA TOTP
- **Estilos**: Tailwind CSS
- **Deploy**: Cloudflare (WAF + Turnstile para protección de bots)

## Estado de la migración
El proyecto está migrando de un sistema JWT propio a Clerk. El JWT actual se guarda en `localStorage` con la clave `servasmar_admin_token` y se envía como `Authorization: Bearer <token>` en cada request. Todo esto debe reemplazarse con Clerk.

## Reglas estrictas para generación de código

### Autenticación
- NUNCA usar `localStorage` para guardar tokens de sesión
- NUNCA generar código que use `jsonwebtoken`, `jose` o librerías JWT propias para autenticación de usuarios
- SIEMPRE usar `auth()` de `@clerk/nextjs/server` en Server Components y API routes
- SIEMPRE usar `useAuth()` o `useUser()` de `@clerk/nextjs` en Client Components
- SIEMPRE proteger rutas con el middleware de Clerk en `middleware.ts`
- El middleware debe usar `clerkMiddleware` y `createRouteMatcher` de `@clerk/nextjs/server`

### Rutas públicas permitidas sin auth
- `/sign-in` y `/sign-up` (páginas de Clerk)
- `/api/webhooks/clerk` (webhook de sincronización, verificado con svix)

### Base de datos — usuarios
- La colección `users` en MongoDB usa `clerkId` (string) como identificador principal
- NUNCA generar passwords ni campos de hash en el schema de usuario
- El schema mínimo de usuario es:
  ```ts
  {
    clerkId: string       // ID de Clerk, clave foránea principal
    email: string
    name: string
    role: 'admin' | 'gestor' | 'visor'
    status: 'active' | 'inactive'
    createdAt: Date
  }
  ```
- Para buscar el usuario en DB desde una API route: `db.collection('users').findOne({ clerkId: userId })`

### Webhook de sincronización
- El webhook vive en `app/api/webhooks/clerk/route.ts`
- Siempre verificar la firma con la librería `svix` antes de procesar
- Manejar los eventos: `user.created`, `user.updated`, `user.deleted`
- En `user.created`: crear documento en colección `users` con `role: 'gestor'` por defecto

### Componentes de UI
- Las páginas de login y registro usan los componentes de Clerk directamente:
  ```tsx
  // app/sign-in/[[...sign-in]]/page.tsx
  import { SignIn } from '@clerk/nextjs'
  export default function Page() { return <SignIn /> }
  ```
- El botón de logout usa `<SignOutButton>` de `@clerk/nextjs`
- Para mostrar datos del usuario en UI usar `<UserButton>` o `useUser()`

### Middleware — estructura base
```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublic = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',
])

export default clerkMiddleware((auth, req) => {
  if (!isPublic(req)) auth().protect()
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
```

### Variables de entorno requeridas
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/admin
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/admin
CLERK_WEBHOOK_SECRET=whsec_...
```

### Qué NO debe aparecer en el código generado
- `localStorage.getItem('servasmar_admin_token')`
- `localStorage.setItem('servasmar_admin_token', ...)`
- `Authorization: Bearer` con tokens JWT propios
- `jwt.sign(...)` o `jwt.verify(...)`
- Rutas `/api/auth/login` o `/api/auth/logout` propias
- Campos `password` o `passwordHash` en el schema de usuario

## Cloudflare
- El WAF de Cloudflare tiene una regla de rate limiting en `/sign-in` (máx 10 req/min por IP)
- Cloudflare Turnstile está configurado como capa anti-bots antes del formulario de login
- No agregar lógica de rate limiting manual en el código Next.js para rutas de auth
