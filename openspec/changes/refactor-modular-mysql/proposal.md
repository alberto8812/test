# Proposal: refactor-modular-mysql

## Intent

El proyecto no puede arrancar (bugs críticos en package.json) y todo el código de conversación vive en un único archivo de 670 líneas. La base de datos es en-memoria: cualquier restart borra el estado de todas las sesiones activas. Este change lo corrige todo en una sola pasada.

## Scope

### In Scope
- Corregir los 6 bugs críticos de arranque (path, deps faltantes, tsx, dead code)
- Separar `flows.ts` en módulos por dominio (common / safi / novahold)
- Extraer servicios reutilizables (email, session) y utils (validators, sanitizers, logger)
- Reemplazar `MemoryDB` por `@builderbot/database-mysql`
- Agregar variables de MySQL a `config.ts` y `.env`
- Reemplazar `type Provider = any; type Database = any` por tipos reales del SDK

### Out of Scope
- Cambios al flujo de conversación o mensajes al usuario
- Agregar nuevas empresas o tipos de requerimiento
- Configurar linter/formatter
- Tests unitarios de los flujos (deuda técnica separada)

## Capabilities

### New Capabilities
- None (refactor puro — el comportamiento visible al usuario no cambia)

### Modified Capabilities
- None

## Approach

Fase 1 — **Fix bugs**: corregir package.json (script + deps), eliminar database.ts dead code, instalar dependencias faltantes.

Fase 2 — **Modularización**: extraer utils y services primero (sin dependencias cruzadas), luego separar flujos por dominio. `flows.ts` queda como barrel con solo `createFlow([...])`.

Fase 3 — **MySQL**: reemplazar `MemoryDB` por `MySQLAdapter` en `app.ts`, agregar config en `config.ts`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` | Modified | Fix dev script + agregar 4 deps faltantes |
| `src/app.ts` | Modified | MemoryDB → MySQLAdapter |
| `src/flows.ts` | Removed | Separado en ~15 archivos |
| `src/database.ts` | Modified | Reemplazar dead code por MySQLAdapter real |
| `src/config.ts` | Modified | Agregar MySQL_HOST/PORT/DB/USER/PASS |
| `src/flows/` | New | common/, safi/, novahold/ |
| `src/services/` | New | email.service.ts, session.service.ts |
| `src/utils/` | New | validators.ts, sanitizers.ts, logger.ts |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Circular imports (welcomeFlow referenciado desde múltiples flujos) | Med | Mover welcomeFlow a common/ primero y verificar imports |
| MySQL no disponible en dev → bot no arranca | Med | Documentar docker-compose mínimo en README |
| gotoFlow rompe si un flujo no está en el createFlow([...]) barrel | Low | Verificar lista completa antes de eliminar flows.ts |

## Rollback Plan

El `flows.ts` original se puede restaurar desde git (`git checkout src/flows.ts`). Los cambios en `package.json` y `app.ts` son reversibles con `git revert`. La migración a MySQL no altera datos existentes (MemoryDB es volátil de por sí).

## Dependencies

- Servidor MySQL accesible (local o remoto) con base de datos creada
- `@builderbot/database-mysql` v1.4.1

## Success Criteria

- [ ] `npm run dev` arranca sin errores
- [ ] El bot responde mensajes en WhatsApp end-to-end
- [ ] No hay `any` en el código TypeScript de los flujos
- [ ] `npx tsc --noEmit` sin errores
- [ ] El state del usuario persiste si el proceso se reinicia
