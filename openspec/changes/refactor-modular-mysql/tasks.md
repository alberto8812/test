# Tasks: refactor-modular-mysql

## Phase 1: Fix Bugs Críticos

- [x] 1.1 Corregir `package.json` dev script: `./base-ts-meta-memory/src/app.ts` → `./src/app.ts`
- [x] 1.2 Agregar deps faltantes en `package.json`: `@builderbot/bot`, `@builderbot/provider-meta`, `dotenv`, `tsx`, `@builderbot/database-mysql`
- [x] 1.3 Ejecutar `npm install` y verificar que no hay errores de resolución
- [ ] 1.4 Verificar que `npm run dev` arranca con MySQL levantado (pendiente: vars MySQL en .env)

## Phase 2: Extraer Utils y Services

> TDD: escribir test primero para funciones puras, luego extraer.

- [x] 2.1 **RED** — Crear `src/utils/validators.test.ts` con tests para `validarEmail`, `validarNombre`, `extraerDatosUsuario` (casos felices + edge cases del spec)
- [x] 2.2 **GREEN** — Crear `src/utils/validators.ts`, mover las 3 funciones desde `flows.ts`, verificar `npm test` pasa
- [x] 2.3 **RED** — Crear `src/utils/sanitizers.test.ts` con tests para `sanitizeInput`, `sanitizeForEmail`, `dividirMensaje`
- [x] 2.4 **GREEN** — Crear `src/utils/sanitizers.ts` con las 3 funciones, `npm test` pasa
- [x] 2.5 Crear `src/utils/logger.ts` — extraer `BotLogger` (sin tests, solo logging)
- [x] 2.6 Crear `src/services/email.service.ts` — extraer `sendEmail()` con lógica de reintentos
- [x] 2.7 Crear `src/services/session.service.ts` — extraer `verificarTimeout`, `resetState`, `validarEmpresaSeleccionada`, `validarDatosUsuario`, `armarResumen`, `finalizarConMenu`, `volverOSalir`, `enviarMensajeDividido`

## Phase 3: Modularizar Flujos

> Orden importa: `welcomeFlow` primero por ser el más referenciado.

- [x] 3.1 Crear `src/flows/common/welcome.flow.ts` — `welcomeFlow` — actualizar todos sus `gotoFlow` imports
- [x] 3.2 Crear `src/flows/common/confirmation.flow.ts` — `flujoConfirmacionDatos`, `flujoReingresoDatos`
- [x] 3.3 Crear `src/flows/common/company-selection.flow.ts` — `flujoSeleccionEmpresa`
- [x] 3.4 Crear `src/flows/common/motivo.flow.ts` — `motivoContactoFlow`, `requerimientoFlow`
- [x] 3.5 Crear `src/flows/common/asesoria.flow.ts` — `asesoriaFlow`
- [x] 3.6 Crear flujos SAFI: `incident.flow.ts`, `req-unlock.flow.ts`, `req-no-operar.flow.ts`, `req-password.flow.ts`, `req-imei.flow.ts`, `req-employee.flow.ts`, `req-other.flow.ts`, `index.ts` (router `requerimientoSafiFlow`) en `src/flows/safi/`
- [x] 3.7 Crear flujos NOVAHOLD: `incident.flow.ts`, `req-password.flow.ts`, `req-equipment.flow.ts`, `req-other.flow.ts`, `index.ts` (router `requerimientoNovaholdFlow`) en `src/flows/novahold/`
- [x] 3.8 Reemplazar `src/flows.ts` por barrel `src/flows/index.ts` con `createFlow([...todos los flujos])` — eliminar `src/flows.ts`

## Phase 4: Migrar a MySQL

- [x] 4.1 Verificar API del constructor: clase es `MysqlAdapter` (no MysqlDB) con `MysqlAdapterCredentials`
- [x] 4.2 Agregar a `src/config.ts` el export `DB_CONFIG` con `MYSQL_DB_HOST`, `MYSQL_DB_PORT`, `MYSQL_DB_USER`, `MYSQL_DB_PASSWORD`, `MYSQL_DB_NAME`
- [ ] 4.3 Completar `.env` con las 5 vars MySQL nuevas (valores locales de desarrollo) — PENDIENTE MANUAL (permisos)
- [x] 4.4 Reemplazar `src/database.ts` con `export const adapterDB = new MysqlAdapter(DB_CONFIG)`
- [x] 4.5 Actualizar `src/app.ts`: reemplazar `new MemoryDB()` inline por `import { adapterDB } from './database'`

## Phase 5: Verificación

- [x] 5.1 Ejecutar `npx tsc --noEmit` — ✅ cero errores
- [x] 5.2 Verificar `npm test` — ✅ 32 tests en verde (18 validators + 14 sanitizers)
- [x] 5.3 Buscar `type.*=.*any` en `src/flows/**` — ✅ ninguno encontrado
- [ ] 5.4 Ejecutar `npm run dev` con MySQL levantado — pendiente: completar .env con vars MySQL
