# TODO - Migración Express -> Next.js (App Router)

## Fase 1: CRM admin (completar lo que falta en Next)
- [ ] Revisar `apps/api/src/routes/crm.ts` y comparar con `apps/web/src/app/api/crm/admin/*`
- [ ] Implementar `GET/POST/PUT/DELETE /admin/projects` en Next
- [ ] Implementar `GET/POST/PUT/DELETE /admin/quotes` en Next (incluye `/:id`)
- [ ] Asegurar que `requirePermission` y `toErrorResponse` se usan de forma consistente

## Fase 2: Validación + QA
- [ ] Ejecutar `apps/web` type-check + lint
- [ ] Ejecutar `apps/api` type-check + lint (para no romper nada mientras convive)
- [ ] Hacer smoke test manual de endpoints CRM admin

## Fase 3: Migración resto de routers (si aplica)
- [ ] appointments
- [ ] availability
- [ ] contact
- [ ] auth
- [ ] users

