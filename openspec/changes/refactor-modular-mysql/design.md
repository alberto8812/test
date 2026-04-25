# Design: refactor-modular-mysql

## Technical Approach

Refactor en 3 fases secuenciales para minimizar riesgo: (1) fix bugs que impiden arrancar, (2) extraer utils/services y separar flujos por dominio, (3) migrar a MySQL. Cada fase es un commit independiente y reversible.

## Architecture Decisions

### Decision: Domain-based folder structure

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Flat (un file por flujo) | Simple pero no refleja el negocio | ❌ |
| Domain-based (common/safi/novahold) | Más archivos, pero mapea a empresas reales | ✅ |
| Por tipo de acción (incidents/, requirements/) | Mezcla empresas en un mismo folder | ❌ |

**Rationale**: El negocio tiene dos empresas con flujos casi paralelos. Una tercera empresa es solo una carpeta nueva.

---

### Decision: MySQLAdapter sobre otros adapters

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| `@builderbot/database-mongo` | Más documentado, pero NoSQL | ❌ |
| `@builderbot/database-mysql` | SQL maduro, preferencia del proyecto | ✅ |
| `@builderbot/database-postgres` | Sin descripción en npm — posible WIP | ❌ |
| `@builderbot/database-json` | File-based, no apto para producción | ❌ |

---

### Decision: welcomeFlow en common/ como primer paso del refactor

`welcomeFlow` es importado vía `gotoFlow(welcomeFlow)` desde 8+ flujos. Si se mueve al final del refactor, los imports quedan inconsistentes. Se mueve primero y se actualiza todo lo que lo referencia antes de tocar cualquier otro flujo.

## Data Flow

```
WhatsApp msg
     │
MetaProvider (src/provider.ts)
     │
createBot (src/app.ts)
     ├── flow: adapterFlow (src/flows.ts — barrel)
     │         ├── src/flows/common/welcome.flow.ts
     │         ├── src/flows/common/confirmation.flow.ts
     │         ├── src/flows/common/company-selection.flow.ts
     │         ├── src/flows/common/motivo.flow.ts
     │         ├── src/flows/common/asesoria.flow.ts
     │         ├── src/flows/safi/*.flow.ts  (7 flujos)
     │         └── src/flows/novahold/*.flow.ts  (4 flujos)
     ├── provider: MetaProvider
     └── database: MysqlDB (src/database.ts)
                       │
                    MySQL server
```

Cada flujo importa desde `../services/` y `../utils/` — sin dependencias entre flujos hermanos excepto a través del barrel.

## File Changes

### Eliminar
| File | Razón |
|------|-------|
| `src/flows.ts` | Reemplazado por módulos + barrel |

### Modificar
| File | Cambio |
|------|--------|
| `package.json` | Fix dev script path + agregar 4 deps |
| `src/app.ts` | `new MemoryDB()` → `new MysqlDB(DB_CONFIG)` |
| `src/database.ts` | Export real `MysqlDB` en lugar de dead code |
| `src/config.ts` | Agregar `DB_CONFIG` con vars MySQL |

### Crear
| File | Contenido |
|------|-----------|
| `src/flows/common/welcome.flow.ts` | `welcomeFlow` |
| `src/flows/common/confirmation.flow.ts` | `flujoConfirmacionDatos`, `flujoReingresoDatos` |
| `src/flows/common/company-selection.flow.ts` | `flujoSeleccionEmpresa` |
| `src/flows/common/motivo.flow.ts` | `motivoContactoFlow`, `requerimientoFlow` |
| `src/flows/common/asesoria.flow.ts` | `asesoriaFlow` |
| `src/flows/safi/incident.flow.ts` | `incidenteFlow` |
| `src/flows/safi/req-unlock.flow.ts` | `desbloquearUsuarioFlow` |
| `src/flows/safi/req-no-operar.flow.ts` | `noPuedoOperarFlow` |
| `src/flows/safi/req-password.flow.ts` | `cambioPasswordImeiFlow` |
| `src/flows/safi/req-imei.flow.ts` | `limpiarIMEIFlow` |
| `src/flows/safi/req-employee.flow.ts` | `nuevoEmpleadoFlow` |
| `src/flows/safi/req-other.flow.ts` | `otroRequerimientoFlow` |
| `src/flows/safi/index.ts` | `requerimientoSafiFlow` (router) |
| `src/flows/novahold/incident.flow.ts` | `novaholdIncidenteFlow` |
| `src/flows/novahold/req-password.flow.ts` | `novaholdReqCambioPassFlow` |
| `src/flows/novahold/req-equipment.flow.ts` | `novaholdReqEquiposFlow` |
| `src/flows/novahold/req-other.flow.ts` | `novaholdReqOtroFlow` |
| `src/flows/novahold/index.ts` | `requerimientoNovaholdFlow` (router) |
| `src/flows/index.ts` | barrel: solo `createFlow([...])` |
| `src/services/email.service.ts` | `sendEmail()` con reintentos |
| `src/services/session.service.ts` | `verificarTimeout`, `resetState`, validaciones |
| `src/utils/validators.ts` | `validarEmail`, `validarNombre`, `extraerDatosUsuario` |
| `src/utils/sanitizers.ts` | `sanitizeForEmail`, `sanitizeInput` |
| `src/utils/logger.ts` | `BotLogger` |

## Interfaces / Contracts

```typescript
// src/config.ts — nuevo export
export const DB_CONFIG = {
  host: process.env.MYSQL_DB_HOST!,
  user: process.env.MYSQL_DB_USER!,
  database: process.env.MYSQL_DB_NAME!,
  password: process.env.MYSQL_DB_PASSWORD!,
  port: Number(process.env.MYSQL_DB_PORT ?? 3306),
}

// src/database.ts
import { MysqlDB } from '@builderbot/database-mysql'
export const adapterDB = new MysqlDB(DB_CONFIG)

// src/app.ts — import real en lugar de inline
import { adapterDB } from './database'
```

## Testing Strategy

| Layer | Qué testear | Approach |
|-------|-------------|----------|
| Unit | `validarEmail`, `validarNombre`, `extraerDatosUsuario`, `sanitizeInput` | vitest — funciones puras, sin deps |
| Unit | `BotLogger`, `dividirMensaje` | vitest |
| Integration | `sendEmail` retry logic | mock de nodemailer transport |
| E2E | Flujo completo WhatsApp → email | No disponible (no hay E2E tool) |

## Migration / Rollout

No hay migración de datos (MemoryDB es volátil). Requiere MySQL server disponible con DB creada antes de arrancar. Variables nuevas requeridas: `MYSQL_DB_HOST`, `MYSQL_DB_PORT`, `MYSQL_DB_USER`, `MYSQL_DB_PASSWORD`, `MYSQL_DB_NAME`.

## Open Questions

- [ ] Verificar API exacta de `MysqlDB` constructor en `@builderbot/database-mysql@1.4.1` — los parámetros asumen convención del SDK pero deben confirmarse con `npm show @builderbot/database-mysql` o docs
