# Improvement Roadmap

## Objetivo

Reducir riesgo operativo, bajar duplicidad entre `apps/web` y `apps/api`, y dejar una base mantenible para auth, usuarios y validaciones de negocio.

## Prioridades

1. Unificar autenticacion, autorizacion y modelo de usuarios.
2. Hacer idempotente el flujo de creacion y sincronizacion de usuarios.
3. Agregar validaciones automatizadas minimas para no romper produccion.
4. Alinear el pipeline del monorepo para validar todas las superficies activas.

## Estado Actual

- `apps/web` es la superficie principal de produccion.
- `apps/api` sigue teniendo logica viva y parcialmente duplicada.
- No hay pruebas del negocio visibles en el repo.
- El root no valida `apps/api` en `build`, `lint` ni `type-check`.

## Fase 1: Congelar y Mapear

Objetivo: definir que codigo sigue activo y que codigo queda como legado.

- [ ] Confirmar si `apps/api` sigue recibiendo trafico real o si ya es solo legado.
- [x] Listar rutas criticas de `apps/web/src/app/api`.
- [x] Listar rutas criticas de `apps/api/src/routes`.
- [x] Marcar modulos duplicados: auth, users, clerk sync, permisos.
- [ ] Decidir si la estrategia sera:
  - `A`: migrar todo a `apps/web`.
  - `B`: extraer logica compartida a `packages`.

Entregable:

- Un inventario corto de rutas activas y duplicadas.

### Inventario Inicial

#### `apps/web/src/app/api`

Superficie principal detectada:

- auth: `auth/login`
- appointments: publicas + admin
- availability
- contact
- crm admin
- documents admin
- finance admin
- users admin
- `webhooks/clerk`

Observacion:

- `apps/web` ya contiene modulos de negocio que no existen en `apps/api`, especialmente `finance`, `documents` y el webhook de Clerk.

#### `apps/api/src/routes`

Superficie Express detectada:

- `auth.ts`
- `appointments.ts`
- `availability.ts`
- `contact.ts`
- `crm.ts`
- `users.ts`

Observacion:

- `apps/api/src/server.ts` sigue montando todas estas rutas bajo `/api/*`, por lo que no es codigo muerto a nivel de repo.

### Duplicidades Confirmadas

- auth:
  - `apps/api/src/routes/auth.ts`
  - `apps/web/src/app/api/auth/login/route.ts`
- appointments admin/public:
  - `apps/api/src/routes/appointments.ts`
  - `apps/web/src/app/api/appointments/**`
- availability:
  - `apps/api/src/routes/availability.ts`
  - `apps/web/src/app/api/availability/**`
- contact:
  - `apps/api/src/routes/contact.ts`
  - `apps/web/src/app/api/contact/route.ts`
- crm:
  - `apps/api/src/routes/crm.ts`
  - `apps/web/src/app/api/crm/admin/**`
- users:
  - `apps/api/src/routes/users.ts`
  - `apps/web/src/app/api/users/admin/**`
- auth/permisos:
  - `apps/api/src/middleware/auth.ts`
  - `apps/web/src/app/api/_lib/auth.ts`

### Diferencias Relevantes

- `apps/web` tiene permisos con `finance`; `apps/api` no.
- `apps/web` incluye reconciliacion de Clerk y webhook propio.
- `apps/api` mantiene una version separada de auth y users que ya no es equivalente.
- ambas superficies exponen respuestas `410` para auth local migrada a Clerk, lo que confirma una duplicacion incluso en rutas de transicion.

### Hipotesis de Trabajo Actual

- `apps/web` es la implementacion funcional mas completa.
- `apps/api` parece una superficie heredada o paralela, pero no esta formalmente retirada.
- hasta confirmar trafico real, conviene tratar `apps/api` como activa para no romper compatibilidad.

### Decision Provisional

Seguir con opcion `B` de forma provisional:

- extraer logica compartida a `packages`
- mantener compatibilidad de `apps/api` mientras se confirma si puede retirarse
- no borrar rutas ni middleware heredados hasta cerrar esa verificacion

## Fase 2: Centralizar Auth y Permisos

Objetivo: eliminar la divergencia entre `apps/web` y `apps/api`.

Archivos candidatos:

- `apps/web/src/app/api/_lib/auth.ts`
- `apps/api/src/middleware/auth.ts`
- `apps/api/src/models/Admin.ts`
- `apps/web/src/app/admin/layout.tsx`

Pasos:

- [x] Extraer helpers comunes:
  - normalizacion de email
  - matriz de permisos por rol
  - lectura de identidad Clerk
- [x] Extraer resolucion de usuario admin.
- [x] Mover esa logica a un modulo compartido en `packages`.
- [x] Hacer que `apps/web` y `apps/api` dependan del mismo modulo.
- [x] Eliminar definiciones duplicadas de permisos.
- [x] Agregar logs controlados para reconciliacion de `clerkId`.

Definicion de terminado:

- Un solo origen de verdad para auth y permisos.
- Misma resolucion de acceso en `apps/web` y `apps/api`.

### Avance Realizado

Extraccion inicial ya implementada en `packages/utils/src/admin-auth.ts`:

- `AdminRole`
- `PermissionKey`
- `PermissionLevel`
- `permissionRank`
- `rolePermissions`
- `resolveDefaultPermissions`
- `normalizeEmail`
- `getPrimaryEmail`
- `resolveAdminRecordByIdentity`
- `createFetchPrimaryEmail`

Consumo actualizado en:

- `apps/web/src/app/api/_lib/auth.ts`
- `apps/api/src/middleware/auth.ts`
- `apps/api/src/routes/users.ts`
- `apps/web/src/app/api/users/admin/route.ts`
- `apps/web/src/app/api/users/admin/[id]/route.ts`
- `apps/web/src/app/api/webhooks/clerk/route.ts`

Validacion ejecutada:

- `npm run type-check -w @servasmar/utils`
- `npm run type-check -w @servasmar/api`
- `npm run type-check -w @servasmar/web`

### Siguiente Corte Seguro

Reducir la duplicacion residual que aun queda dentro de cada app:

- inicializacion del cliente Clerk para auth
- manejo de cache local de admin

La reconciliacion y el logging ya quedaron compartidos en lo sustancial.
El ultimo remanente real de Fase 2 es decidir si el cache local de admin vale la pena unificar o si se deja especifico por runtime.

## Fase 3: Rehacer Provisioning de Usuarios

Objetivo: evitar estados inconsistentes entre Mongo y Clerk.

Archivos candidatos:

- `apps/web/src/app/api/users/admin/route.ts`
- `apps/web/src/app/api/users/admin/[id]/route.ts`
- `apps/api/src/routes/users.ts`
- `apps/web/src/app/api/webhooks/clerk/route.ts`

Pasos:

- [x] Definir estados internos explicitos:
  - `pending_invitation`
  - `active`
  - `sync_error`
- [~] Evitar depender de `pending:` como unico mecanismo tecnico.
- [x] Separar:
  - creacion de registro interno
  - envio de invitacion Clerk
  - reconciliacion webhook
- [x] Hacer idempotente la invitacion por email.
- [x] Agregar accion de reenvio de invitacion desde admin.
- [x] Agregar manejo de rollback o reintento cuando Clerk falle.

Definicion de terminado:

- Un usuario nunca queda en estado ambiguo.
- El panel puede mostrar si el usuario esta pendiente, activo o con error de sincronizacion.

### Avance Realizado

Primer corte implementado para explicitar provisioning:

- nuevo helper compartido en `packages/utils/src/admin-provisioning.ts`
- nuevo campo `provisioningStatus` en `Admin`
- nuevos campos `provisioningError`, `invitationSentAt` y `activatedAt`

Estados soportados en este corte:

- `pending_invitation`
- `active`
- `sync_error`

Comportamiento nuevo:

- `POST /api/users/admin` y su par en `apps/api` ahora crean primero el registro interno
- si la invitacion Clerk resulta bien, el usuario queda en `pending_invitation`
- si la invitacion Clerk falla, el usuario queda en `sync_error` con mensaje persistido en `provisioningError`
- el webhook de Clerk promueve el registro a `active` al reconciliar identidad real
- el panel `admin/usuarios` ya muestra el estado de provisioning y el error si existe

Compatibilidad mantenida:

- el placeholder `pending:` sigue existiendo como mecanismo transitorio de compatibilidad tecnica
- la logica ya no depende solo de ese prefijo para mostrar estado al negocio
- `status` del usuario sigue separado de `provisioningStatus`

Pendiente para el siguiente corte:

- dejar de usar `pending:` como placeholder interno
- decidir si conviene modelar invitaciones con un `invitationId` real de Clerk

### Segundo Corte Implementado

Provisioning accionable desde admin:

- `POST /api/users/admin/[id]` en `apps/web` ahora reenvia invitacion para usuarios en `pending_invitation` o `sync_error`
- `POST /api/users/admin/:id/resend-invitation` en `apps/api` mantiene paridad operativa
- el reenvio reutiliza `ignoreExisting: true`, por lo que el flujo queda idempotente por email del lado de Clerk
- al reenviar, el usuario vuelve a `pending_invitation` y limpia `provisioningError` si la invitacion resulta bien
- si el reenvio vuelve a fallar, el usuario permanece en `sync_error` con error actualizado

Refuerzo tecnico:

- `packages/utils/src/admin-provisioning.ts` ahora expone `canResendInvitation` y `hasClerkIdentity`
- `delete` y otras operaciones sensibles ya usan identidad Clerk resuelta en vez de inferir todo solo desde `pending:`
- `admin/usuarios` ahora permite reintentar invitaciones desde el modal cuando aplica
- `admin/usuarios` ahora permite filtrar por `provisioningStatus` para separar pendientes, sincronizados y errores

Validacion adicional ejecutada:

- `npm run lint -w @servasmar/utils`
- `npm run lint -w @servasmar/api`
- `npm run check`

Validacion ejecutada:

- `npm run type-check -w @servasmar/utils`
- `npm run type-check -w @servasmar/api`
- `npm run type-check -w @servasmar/web`
- `npm run lint -w @servasmar/utils`
- `npm run lint -w @servasmar/api`

## Fase 4: Pipeline del Monorepo

Objetivo: evitar que una parte del sistema se rompa sin enterarnos.

Archivos candidatos:

- `package.json`
- `apps/api/package.json`
- `.github/` si luego se agrega CI real

Pasos:

- [x] Agregar scripts root para:
  - `build:web`
  - `build:api`
  - `type-check:web`
  - `type-check:api`
  - `lint:web`
- [x] Resolver `lint:api` y `lint:utils` con config compatible con ESLint 9.
- [x] Hacer que `build` y `type-check` del root validen ambas apps si ambas siguen activas.
- [x] Agregar un script `check` que corra todo junto.
- [ ] Si `apps/api` deja de ser activa, sacarla del flujo principal y documentarlo.

Definicion de terminado:

- Ninguna app activa queda fuera del pipeline local.

### Avance Realizado

Scripts root agregados en `package.json`:

- `build:utils`
- `build:ui`
- `build:api`
- `build:web`
- `type-check:utils`
- `type-check:ui`
- `type-check:api`
- `type-check:web`
- `lint:web`
- `check`

Cambio de comportamiento:

- `build` ahora valida la cadena activa completa: `utils -> ui -> api -> web`
- `type-check` ahora valida los mismos paquetes activos
- `check` ejecuta `type-check`, luego `build` y finalmente `lint:web`

Cobertura de lint agregada:

- `apps/api/eslint.config.mjs`
- `packages/utils/eslint.config.mjs`
- `apps/web` sigue lintando correctamente con `next lint`

Limpieza aplicada para soportar esa validacion:

- se reemplazaron `any` evitables en helpers compartidos y middleware de auth
- se ajustaron tipos genericos de Clerk para `createFetchPrimaryEmail`
- se limpiaron imports y parametros no usados en rutas y middleware de `apps/api`

Validacion ejecutada:

- `npm run build -w @servasmar/utils`
- `npm run build -w @servasmar/ui`
- `npm run build -w @servasmar/api`
- `npm run lint -w @servasmar/utils`
- `npm run lint -w @servasmar/api`
- `npm run type-check -w @servasmar/api`
- `npm run type-check -w @servasmar/web`
- `npm run type-check -w @servasmar/ui`
- `npm run lint -w @servasmar/web`
- `npm run check`

Nota operativa:

- `apps/web` depende de `.next/types` en su `tsconfig`
- por eso conviene ejecutar `build`, `type-check` y `check` en serie cuando haya otra compilacion de Next corriendo, para evitar errores transitorios por archivos regenerados dentro de `.next`

## Fase 5: Tests Minimos de Negocio

Objetivo: cubrir los flujos mas caros de romper.

Casos minimos:

- [ ] login admin autorizado
- [ ] login admin inactivo
- [ ] login admin no autorizado
- [x] create user pendiente
- [ ] reconcile user por email
- [x] permisos por rol
- [ ] webhook Clerk crea o actualiza vinculo

Implementacion sugerida:

- [x] tests unitarios para helpers de auth
- [ ] tests de integracion para rutas de usuarios
- [x] mocks de Clerk para no depender de red

Definicion de terminado:

- Los flujos criticos de auth y users tienen cobertura automatizada.

### Avance Realizado

Base inicial de tests agregada en `packages/utils`:

- `src/admin-auth.test.ts`
- `src/admin-provisioning.test.ts`
- `src/admin-users.test.ts`

Cobertura actual:

- normalizacion de email
- resolucion de permisos por rol
- lectura de email primario de Clerk
- reconciliacion de admin por `clerkId` y email
- fallback cuando falla el lookup de Clerk
- resolucion de `pending_invitation`, `active` y `sync_error`
- deteccion de identidad Clerk real
- reenvio permitido solo para estados recuperables
- armado de filtros admin para listado de usuarios
- construccion compartida de payloads de create, update y resend para usuarios admin

Soporte de ejecucion agregado:

- script `test` en `@servasmar/utils`
- script root `test:utils`
- ajuste en `packages/utils/tsconfig.json` para que `build` emita artefactos reales

Refactor cubierto por esa base:

- nuevo modulo compartido `packages/utils/src/admin-users.ts`
- `apps/web/src/app/api/users/admin/route.ts` consume helpers compartidos para listado y creacion
- `apps/web/src/app/api/users/admin/[id]/route.ts` consume helpers compartidos para update y resend
- `apps/api/src/routes/users.ts` consume los mismos helpers para mantener paridad operativa

Validacion ejecutada:

- `npm run build -w @servasmar/utils`
- `npm run type-check -w @servasmar/utils`
- `npm run lint -w @servasmar/utils`
- `npm run test -w @servasmar/utils`
- `npm run type-check -w @servasmar/api`
- `npm run type-check -w @servasmar/web`
- `npm run lint -w @servasmar/api`

## Fase 6: Observabilidad y Operacion

Objetivo: hacer visibles los errores reales de produccion.

Pasos:

- [ ] Agregar logging estructurado en auth, users y webhooks.
- [ ] Registrar eventos de reconciliacion de `clerkId`.
- [ ] Registrar errores de Clerk con contexto minimo:
  - email
  - accion
  - ruta
- [ ] Crear mensajes de error mas accionables para el panel admin.

Definicion de terminado:

- Cuando falle auth o provisioning, el equipo puede identificar la causa sin inspeccion manual extensa.

## Orden Recomendado de Ejecucion

1. Fase 1
2. Fase 2
3. Fase 3
4. Fase 4
5. Fase 5
6. Fase 6

## Proximo Paso Recomendado

Empezar por Fase 1 y cerrar una decision binaria:

- Si `apps/api` ya no es productiva, la simplificacion mas rentable es retirar su auth y rutas duplicadas del camino principal.
- Si `apps/api` sigue activa, entonces la primera modificacion real debe ser extraer auth y permisos compartidos a `packages`.

## Siguiente Ejecucion Sugerida

Paso inmediato recomendado:

1. crear un paquete compartido para auth/permisos
2. mover ahi:
   - matriz de permisos
   - normalizacion de email
   - resolucion de admin por `clerkId` y email
3. adaptar primero `apps/web`
4. adaptar despues `apps/api`
