# Delta for Infrastructure

> Refactor puro: no hay cambios de comportamiento visible al usuario.
> Estos specs cubren los requisitos no-funcionales que SÍ cambian.

## ADDED Requirements

### Requirement: Project Bootstrap

The project MUST start successfully with `npm run dev` without any module-not-found errors.

All runtime dependencies (@builderbot/bot, @builderbot/provider-meta, dotenv) MUST be declared in `package.json`.

#### Scenario: Arranque exitoso

- GIVEN el archivo `.env` existe con todas las variables requeridas
- WHEN se ejecuta `npm run dev`
- THEN el proceso arranca y loguea `✅ NovaDesk Bot corriendo en puerto {PORT}`
- AND no hay errores `MODULE_NOT_FOUND` en stdout

#### Scenario: Dependencia faltante

- GIVEN una instalación limpia (`npm install` desde cero)
- WHEN se ejecuta `npm run dev`
- THEN todas las dependencias resuelven correctamente
- AND el bot queda en escucha en el puerto configurado

---

### Requirement: State Persistence

El estado de sesión del usuario (nombre, email, empresa, tipo de requerimiento) MUST persistir si el proceso Node.js se reinicia mientras la conversación está activa.

El adaptador de base de datos MUST ser `@builderbot/database-mysql` (no MemoryDB).

#### Scenario: Restart durante conversación activa

- GIVEN un usuario tiene una sesión activa con empresa y datos guardados
- WHEN el proceso Node.js se reinicia
- THEN al retomar la conversación el estado anterior está disponible

#### Scenario: Conexión MySQL no disponible al arrancar

- GIVEN las variables MYSQL_* están configuradas pero el servidor no está accesible
- WHEN se ejecuta `npm run dev`
- THEN el proceso falla con un error claro de conexión (no un error silencioso)

---

### Requirement: TypeScript Type Safety

Ningún archivo en `src/` MUST usar `type X = any` para los tipos de Provider o Database del SDK.

`npx tsc --noEmit` MUST pasar sin errores.

#### Scenario: Compilación TypeScript

- GIVEN el código fuente está completo
- WHEN se ejecuta `npx tsc --noEmit`
- THEN la salida es vacía (cero errores, cero warnings de tipo)

---

### Requirement: Modular File Structure

El código de flujos MUST estar organizado en módulos por dominio bajo `src/flows/`.

`src/flows.ts` MUST contener únicamente el `createFlow([...])` con los imports de todos los flujos.

#### Scenario: Agregar nuevo flujo SAFI

- GIVEN existe `src/flows/safi/`
- WHEN se agrega un nuevo flujo SAFI
- THEN solo se crea un archivo en `src/flows/safi/` y se agrega al barrel `src/flows.ts`
- AND no se modifica ningún otro archivo de flujo existente
