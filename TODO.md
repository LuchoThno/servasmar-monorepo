# PROMPT PARA VS CODE — ESCALADA SISTEMA SERVASMAR

Actúa como Arquitecto de Software Senior Full Stack.

Necesito escalar el sistema actual de **SERVASMAR**, sin romper ni reemplazar lo ya construido.

El objetivo es agregar un **Módulo de Control de Costos, Finanzas, Cobranza y Documentación**, manteniendo la arquitectura actual y respetando las integraciones ya realizadas con Google.

---

## 1. Contexto del Proyecto

El sistema corresponde a:

**SERVASMAR — Servicios de Asesoría Marítima & Seguridad Vargas Limitada**

Actualmente el sistema ya cuenta con una base funcional construida con:

- Next.js
- Node.js
- MongoDB
- Google Drive API
- Google Calendar API
- OAuth Google configurado
- Variables de entorno existentes
- Estructura previa de autenticación e integración

El nuevo desarrollo debe ser una **escalada progresiva del sistema**, no una reconstrucción desde cero.

---

## 2. Regla Principal

No modificar ni romper las integraciones existentes.

Se debe:

- Mantener la tecnología actual.
- Mantener Next.js.
- Mantener Node.js.
- Mantener MongoDB.
- Mantener Google Drive API.
- Mantener Google Calendar API.
- Mantener las variables actuales.
- Mantener la estructura funcional ya creada.
- Agregar nuevos modelos, rutas, componentes y servicios sin afectar lo existente.

Solo modificar lo estrictamente necesario para lograr el módulo final.

---

## 3. Objetivo del Nuevo Módulo

Crear un módulo denominado:

# Control Financiero SERVASMAR

Este módulo debe permitir controlar:

- Clientes
- Proyectos o servicios
- Facturas
- Cuotas
- Pagos recibidos
- Ingresos
- Egresos
- Centros de costos
- Documentos respaldados en Google Drive
- Reportes ejecutivos
- Flujo de caja
- Rentabilidad por proyecto

---

## 4. Módulos a Implementar

## 4.1 Dashboard Financiero

Crear una vista principal con indicadores:

- Ingresos del mes
- Egresos del mes
- Utilidad estimada
- Facturación pendiente
- Facturación vencida
- Proyectos activos
- Clientes activos
- Cuotas pendientes
- Cuotas vencidas

Agregar gráficos simples:

- Ingresos vs egresos
- Rentabilidad por proyecto
- Estado de cobranza

---

## 4.2 Clientes

Crear módulo CRUD de clientes.

Campos sugeridos:

- Nombre o razón social
- RUT
- Giro
- Representante legal
- Correo
- Teléfono
- Dirección
- Estado
- Observaciones
- ID carpeta Google Drive

Estados:

- Activo
- Inactivo
- Moroso
- Finalizado

Cuando se cree un cliente, el sistema debe crear o vincular una carpeta en Google Drive dentro de la carpeta raíz ya configurada.

---

## 4.3 Proyectos / Servicios

Crear módulo para registrar servicios prestados por SERVASMAR.

Tipos de servicios:

- Asesoría marítima
- Concesión marítima
- Seguridad portuaria
- Auditoría PBIP / ISPS
- Capacitación
- Consultoría
- Gestión documental
- Otro

Campos:

- Código del proyecto
- Nombre del proyecto
- Cliente asociado
- Tipo de servicio
- Fecha de inicio
- Fecha de término
- Valor contratado
- Estado
- Responsable
- Observaciones
- ID carpeta Google Drive

Estados:

- Prospecto
- Cotizado
- Aprobado
- En ejecución
- Facturado
- Cerrado
- Anulado

Al crear un proyecto, generar una subcarpeta en Drive dentro de la carpeta del cliente.

---

## 4.4 Facturación

Crear módulo para registrar facturas manualmente.

Campos:

- Número de factura
- Cliente
- Proyecto
- Fecha de emisión
- Fecha de vencimiento
- Neto
- IVA
- Total
- Estado
- Documento Drive

Estados:

- Pendiente
- Pagada
- Vencida
- Anulada

El sistema debe calcular automáticamente:

- IVA
- Total
- Días de atraso
- Estado vencido según fecha

---

## 4.5 Cuotas y Cobranza

Permitir dividir un proyecto o factura en cuotas.

Campos:

- Cliente
- Proyecto
- Factura asociada
- Número de cuota
- Monto
- Fecha de vencimiento
- Fecha de pago
- Estado
- Medio de pago
- Comprobante Drive
- Observaciones

Estados:

- Pendiente
- Pagada
- Pago parcial
- Vencida
- Anulada

El sistema debe mostrar:

- Cuotas pendientes
- Cuotas vencidas
- Total por cobrar
- Historial de pagos
- Alertas visuales por mora

---

## 4.6 Ingresos

Registrar ingresos recibidos.

Campos:

- Fecha
- Cliente
- Proyecto
- Factura asociada
- Cuota asociada
- Monto
- Medio de pago
- Observaciones
- Comprobante Drive

Medios de pago:

- Transferencia
- Depósito
- Efectivo
- Webpay
- Otro

Cuando se registre un ingreso asociado a una cuota, actualizar automáticamente el estado de la cuota.

---

## 4.7 Egresos

Crear módulo de egresos operacionales.

Categorías:

- Honorarios
- Transporte
- Combustible
- Hospedaje
- Alimentación
- Equipamiento
- Software
- Marketing
- Servicios externos
- Permisos
- Impuestos
- Otros

Campos:

- Fecha
- Categoría
- Proveedor
- Proyecto asociado
- Monto
- Estado
- Observaciones
- Documento Drive

Estados:

- Pendiente
- Pagado
- Anulado

---

## 4.8 Centro de Costos

Cada proyecto debe funcionar como centro de costos.

Calcular automáticamente:

- Total ingresos del proyecto
- Total egresos del proyecto
- Utilidad bruta
- Margen porcentual
- Estado financiero del proyecto

Ejemplo:

Ingresos del proyecto: $5.000.000  
Egresos del proyecto: $1.500.000  
Utilidad: $3.500.000  
Margen: 70%

---

## 4.9 Documentos Google Drive

Mantener la integración actual con Google Drive API.

No reemplazar la autenticación existente.

Crear estructura documental:

SERVASMAR/
CLIENTES/
[NOMBRE_CLIENTE]/
PROYECTOS/
[NOMBRE_PROYECTO]/
CONTRATOS/
FACTURAS/
COMPROBANTES/
INFORMES/
FOTOGRAFIAS/
ENTREGABLES/
EGRESOS/

Funciones requeridas:

- Subir documentos
- Asociar documentos a clientes
- Asociar documentos a proyectos
- Asociar documentos a facturas
- Asociar documentos a ingresos
- Asociar documentos a egresos
- Guardar fileId de Drive en MongoDB
- Guardar webViewLink si está disponible
- Permitir abrir documento desde el sistema

---

## 4.10 Calendario

Mantener Google Calendar API existente.

No modificar la integración base.

Agregar opcionalmente eventos automáticos para:

- Vencimiento de facturas
- Vencimiento de cuotas
- Reuniones con clientes
- Hitos de proyectos

---

## 5. Base de Datos MongoDB

Crear o extender colecciones sin romper las actuales.

Colecciones nuevas sugeridas:

- clients
- projects
- invoices
- installments
- payments
- incomes
- expenses
- documents
- costCenters
- activityLogs

Cada documento debe incluir:

- createdAt
- updatedAt
- createdBy
- updatedBy
- status

---

## 6. Relaciones Lógicas

Cliente tiene muchos proyectos.

Proyecto pertenece a un cliente.

Proyecto tiene muchas facturas.

Factura puede tener muchas cuotas.

Cuota puede tener uno o más pagos.

Proyecto tiene muchos ingresos.

Proyecto tiene muchos egresos.

Proyecto tiene muchos documentos.

Cada documento puede estar asociado a:

- Cliente
- Proyecto
- Factura
- Cuota
- Ingreso
- Egreso

---

## 7. Estructura de Carpetas Recomendada

No eliminar la estructura existente.

Agregar solo lo necesario:

src/
├── app/
│   ├── dashboard/
│   ├── clientes/
│   ├── proyectos/
│   ├── finanzas/
│   │   ├── facturas/
│   │   ├── cobranza/
│   │   ├── ingresos/
│   │   ├── egresos/
│   │   └── centros-costos/
│   ├── documentos/
│   └── reportes/
│
├── components/
│   ├── dashboard/
│   ├── clientes/
│   ├── proyectos/
│   ├── finanzas/
│   ├── documentos/
│   └── ui/
│
├── lib/
│   ├── mongodb.ts
│   ├── google-drive.ts
│   ├── google-calendar.ts
│   ├── validations/
│   └── utils.ts
│
├── models/
│   ├── Client.ts
│   ├── Project.ts
│   ├── Invoice.ts
│   ├── Installment.ts
│   ├── Payment.ts
│   ├── Income.ts
│   ├── Expense.ts
│   ├── Document.ts
│   └── ActivityLog.ts
│
└── services/
    ├── clientService.ts
    ├── projectService.ts
    ├── financeService.ts
    ├── driveService.ts
    └── calendarService.ts

---

## 8. Reglas de Desarrollo

El código debe:

- Usar TypeScript.
- Mantener buenas prácticas.
- No duplicar servicios existentes.
- Reutilizar la conexión actual a MongoDB.
- Reutilizar helpers existentes de Google.
- No cambiar variables de entorno salvo que sea necesario.
- No eliminar rutas actuales.
- No romper el login ni OAuth.
- No romper Drive.
- No romper Calendar.
- Ser modular y escalable.

---

## 9. Variables de Entorno

Mantener las actuales.

No cambiar nombres si ya existen.

Variables esperadas:

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_DRIVE_ROOT_FOLDER_ID=
GOOGLE_CALENDAR_ID=
MONGODB_URI=
NEXT_PUBLIC_APP_URL=

Agregar solo si son necesarias:

NEXT_PUBLIC_COMPANY_NAME=SERVASMAR
NEXT_PUBLIC_COMPANY_RUT=
NEXT_PUBLIC_COMPANY_EMAIL=

---

## 10. Validaciones

Implementar validaciones para:

- RUT chileno
- Correo electrónico
- Montos positivos
- Fechas válidas
- Estados permitidos
- Archivos permitidos
- Tamaño máximo de archivos

---

## 11. Reportes

Crear reportes iniciales:

- Flujo de caja mensual
- Estado de cobranza
- Facturas vencidas
- Rentabilidad por proyecto
- Ingresos por cliente
- Egresos por categoría

Permitir exportar en una segunda etapa:

- PDF
- Excel

---

## 12. UX/UI

Mantener diseño corporativo marítimo SERVASMAR.

Estilo:

- Ejecutivo
- Limpio
- Profesional
- Responsive
- Panel lateral
- Tarjetas de indicadores
- Tablas con filtros
- Acciones rápidas

Colores sugeridos:

- Azul marino
- Azul petróleo
- Blanco
- Gris claro
- Dorado sobrio

---

## 13. Plan de Implementación por Etapas

## Etapa 1 — Base Financiera

- Crear modelos MongoDB.
- Crear clientes.
- Crear proyectos.
- Crear facturas.
- Crear cuotas.
- Crear dashboard básico.

## Etapa 2 — Drive Documental

- Crear carpetas por cliente.
- Crear carpetas por proyecto.
- Subir documentos.
- Asociar documentos a registros.
- Guardar fileId y links en MongoDB.

## Etapa 3 — Ingresos y Egresos

- Registrar ingresos.
- Registrar egresos.
- Asociar pagos a cuotas.
- Calcular saldos.
- Calcular utilidad por proyecto.

## Etapa 4 — Cobranza

- Identificar cuotas vencidas.
- Identificar facturas vencidas.
- Crear alertas visuales.
- Generar historial de cobranza.

## Etapa 5 — Reportes

- Flujo de caja.
- Rentabilidad.
- Estado de resultados simple.
- Reportes por cliente y proyecto.

## Etapa 6 — Calendar

- Crear eventos opcionales por vencimientos.
- Crear recordatorios de cobranza.
- Mantener integración existente.

---

## 14. Resultado Esperado

Entregar código funcional para escalar el sistema actual.

Debe incluir:

- Nuevas páginas.
- Nuevos modelos.
- Nuevos servicios.
- Nuevos componentes.
- Formularios.
- Validaciones.
- Integración con Drive existente.
- Integración opcional con Calendar existente.
- Dashboard financiero.
- Cálculos automáticos.
- Estructura escalable.

No reconstruir el sistema.

No eliminar código existente.

No cambiar innecesariamente integraciones Google.

El resultado debe permitir que SERVASMAR controle clientes, proyectos, facturación, cuotas, ingresos, egresos, documentos y rentabilidad desde un solo sistema.