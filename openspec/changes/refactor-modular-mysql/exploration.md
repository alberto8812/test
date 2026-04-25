# Exploration: refactor-modular-mysql

**Change**: Refactorización modular + migración a MySQL
**Project**: novadesk
**Date**: 2026-04-25

---

## Current State

Bot de WhatsApp de help desk para SAFI y NOVAHOLD construido sobre `@builderbot/bot` + MetaProvider.

### Estructura actual
```
src/
  app.ts        — bootstrap (createBot + httpServer)
  provider.ts   — MetaProvider con webhook challenge handler
  flows.ts      — 670 líneas: 20 flujos + helpers + tipos + logger (TODO junto)
  config.ts     — variables de entorno + validaciones
  database.ts   — DEAD CODE (MemoryDB export nunca importado)
```

### Flujo de conversación
```
Saludo → Datos usuario → Confirmación → Empresa (SAFI/NOVAHOLD)
  → Tipo (Incidente / Requerimiento / Asesoría)
    → Sub-flujo específico → Email (nodemailer + Office365)
```

### Bugs críticos activos
1. `package.json` dev script apunta a `./base-ts-meta-memory/src/app.ts` (no existe)
2. `@builderbot/bot`, `@builderbot/provider-meta`, `dotenv` ausentes en `package.json`
3. `nodemon.json` usa `tsx` pero `tsx` no está en `package.json`
4. `database.ts` exporta `adapterDB` pero `app.ts` crea `new MemoryDB()` inline → código muerto
5. `type Provider = any; type Database = any` en flows.ts → TypeScript inútil
6. `MemoryDB` pierde estado en cada restart

---

## Affected Areas

- `package.json` — fix dev script + agregar dependencias faltantes
- `src/app.ts` — cambiar MemoryDB por MySQLAdapter
- `src/flows.ts` — separar en ~15 archivos por dominio
- `src/database.ts` — eliminar o reemplazar
- `src/config.ts` — agregar variables de MySQL

---

## Approaches

### 1. Flat modular — un archivo por flujo, sin carpetas
```
src/flows/
  welcome.flow.ts
  confirmation.flow.ts
  company-selection.flow.ts
  incident.flow.ts
  requirement.flow.ts
  ...
```
- **Pros**: Fácil de implementar, fácil de encontrar archivos
- **Cons**: No refleja dominios de negocio, difícil escalar cuando hay más empresas
- **Effort**: Low

### 2. Domain-based — carpetas por empresa
```
src/flows/
  common/       welcome, confirmation, company-selection
  safi/         incident, requirements (password, imei, employee, other)
  novahold/     incident, requirements (password, equipment, other)
```
- **Pros**: Refleja el dominio de negocio, fácil agregar nueva empresa
- **Cons**: Algo más de estructura inicial
- **Effort**: Medium

### 3. Domain + Services (recomendada)
```
src/
  flows/
    common/     welcome.flow.ts, confirmation.flow.ts, company-selection.flow.ts, motivo.flow.ts, asesoria.flow.ts
    safi/       incident.flow.ts, req-password.flow.ts, req-imei.flow.ts, req-employee.flow.ts, req-other.flow.ts
    novahold/   incident.flow.ts, req-password.flow.ts, req-equipment.flow.ts, req-other.flow.ts
  services/
    email.service.ts     sendEmail() con reintentos
    session.service.ts   verificarTimeout, resetState, validarEmpresa, validarDatos
  utils/
    validators.ts        validarEmail, validarNombre, extraerDatosUsuario
    sanitizers.ts        sanitizeForEmail, sanitizeInput
    logger.ts            BotLogger
  config.ts
  database.ts            MySQLAdapter (reemplaza MemoryDB)
  provider.ts
  flows.ts               solo createFlow([...]) con todos los imports
  app.ts
```
- **Pros**: Separación de responsabilidades, servicios reutilizables entre flujos, dominio explícito, fácil de testear
- **Cons**: Más archivos que gestionar
- **Effort**: Medium

---

## Recommendation

**Opción 3: Domain + Services**.

Y para ya que estamos:
- Fix de los 6 bugs críticos como primera tarea
- Migración a `@builderbot/database-mysql` en `src/database.ts`
- Tipos reales de `@builderbot/bot` en lugar de `any`

La estructura de dominio mapea directamente al negocio: cuando se agregue una tercera empresa, solo se crea una carpeta nueva sin tocar nada existente.

---

## Risks

- `@builderbot/database-mysql` requiere variables de entorno adicionales (host, port, db, user, pass) + servidor MySQL levantado
- Los `gotoFlow()` entre archivos requieren imports cruzados — hay que verificar que no haya circular dependencies
- `welcomeFlow` se referencia desde múltiples flujos con `gotoFlow(welcomeFlow)` — al moverlo hay que actualizar todos los imports

---

## Ready for Proposal

Yes. La exploración es clara, el scope está definido. El proposal debe cubrir:
1. Fix de bugs críticos (prerequisito)
2. Reestructuración modular (Domain + Services)
3. Migración MySQL
4. Fix de tipos TypeScript
