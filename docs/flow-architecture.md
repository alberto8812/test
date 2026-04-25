# Arquitectura de Flujos — NovaDesk Bot

Cómo funciona el motor de conversación de `@builderbot/bot` con el código real del proyecto.

---

## El punto de entrada: `flows/index.ts`

```ts
export const adapterFlow = createFlow([
  welcomeFlow,
  flujoConfirmacionDatos,
  // ... los 20 flows
])
```

`createFlow` recibe un array de flows y construye un **mapa interno** de todos los posibles estados de conversación. El bot no ejecuta los flows en orden — los registra todos y los activa según la lógica de cada uno.

---

## Dos tipos de trigger

### 1. `addKeyword` — el usuario dispara el flujo con texto

```ts
// welcome.flow.ts
export const welcomeFlow = addKeyword([
  'hola', 'hi', 'hello', 'buenos dias', ...
])
```

Solo `welcomeFlow` usa keywords. Cuando el usuario escribe "hola", el bot busca en su mapa quién tiene ese keyword y arranca ese flujo. **Es el único punto de entrada real al bot.**

### 2. `EVENTS.ACTION` — solo activable por código

```ts
// confirmation.flow.ts
export const flujoConfirmacionDatos = addKeyword(EVENTS.ACTION)
```

Todos los demás flows usan `EVENTS.ACTION`. Eso significa: **nunca se activan por lo que escribe el usuario**. Solo se pueden activar con `gotoFlow`. Son como funciones privadas.

---

## `addAnswer` — el corazón de cada flujo

Tiene tres modos:

```ts
// Modo 1: solo envía un mensaje
.addAnswer('👋 ¡Hola! Soy *NovaDesk*!')

// Modo 2: envía y espera respuesta
.addAnswer('Escribí tu nombre y email', { capture: true }, async (ctx, { ... }) => {
  // ctx.body = lo que escribió el usuario
})

// Modo 3: envía con botones y espera
.addAnswer(
  '¿Es correcto?',
  { buttons: [{ body: '✅ Sí' }, { body: '❌ No' }], capture: true },
  async (ctx, { ... }) => { ... }
)
```

`capture: true` es el **pause**. El bot manda el mensaje, congela ese flujo, y cuando el usuario responde ejecuta el callback.

---

## Navegación: `gotoFlow`

```ts
// welcome.flow.ts — después de validar nombre y email
const { flujoConfirmacionDatos } = await import('./confirmation.flow')
return gotoFlow(flujoConfirmacionDatos)
```

`gotoFlow` es un **goto**. Termina el flow actual y activa otro. El `return` es obligatorio — sin él el flow actual sigue ejecutando después del goto.

El flujo completo de una sesión:

```
welcomeFlow
    └── gotoFlow(flujoConfirmacionDatos)
            ├── "sí" → gotoFlow(flujoSeleccionEmpresa)
            └── "no" → gotoFlow(flujoReingresoDatos)
                            └── gotoFlow(flujoConfirmacionDatos)  ← vuelve

flujoSeleccionEmpresa
    └── gotoFlow(motivoContactoFlow)
            ├── "incidente"     → gotoFlow(incidenteFlow | novaholdIncidenteFlow)
            ├── "requerimiento" → gotoFlow(requerimientoFlow)
            │       ├── empresa === 'safi'     → gotoFlow(requerimientoSafiFlow)
            │       │       ├── "1" → gotoFlow(cambioPasswordImeiFlow)
            │       │       ├── "2" → gotoFlow(limpiarIMEIFlow)
            │       │       ├── "3" → gotoFlow(nuevoEmpleadoFlow)
            │       │       └── "4" → gotoFlow(otroRequerimientoFlow)
            │       └── empresa === 'novahold' → gotoFlow(requerimientoNovaholdFlow)
            │               ├── "1" → gotoFlow(novaholdReqCambioPassFlow)
            │               ├── "2" → gotoFlow(novaholdReqEquiposFlow)
            │               └── "3" → gotoFlow(novaholdReqOtroFlow)
            └── "asesoría"      → gotoFlow(asesoriaFlow)
```

---

## `state` — la memoria de la sesión

```ts
// Guardar datos en cualquier flow
await state.update({ nombreUsuario: nombre, emailUsuario: email })

// Leer datos desde otro flow
const empresa = await state.get('empresa')
```

`state` es el **contexto compartido** entre todos los flows de la misma conversación. Persiste en MySQL — si el proceso se cae y vuelve, el usuario retoma donde estaba.

Campos que guarda este bot:

| Campo | Tipo | Qué contiene |
|---|---|---|
| `nombreUsuario` | string | Nombre capturado en `welcomeFlow` |
| `emailUsuario` | string | Email capturado en `welcomeFlow` |
| `empresa` | `'Safi'` \| `'Novahold'` | Empresa seleccionada |
| `tipoRequerimiento` | string | Requerimiento elegido en el router SAFI/NOVAHOLD |
| `ultimaActividad` | number | Timestamp para el timeout de sesión |
| `sesionValidada` | boolean | Si los datos del usuario fueron confirmados |

---

## Por qué `await import(...)` en vez de import estático

```ts
// ❌ Crea dependencia circular (A importa B, B importa A → crash al cargar)
import { flujoConfirmacionDatos } from './confirmation.flow'

// ✅ Import dinámico: se resuelve en runtime, no al cargar el módulo
const { flujoConfirmacionDatos } = await import('./confirmation.flow')
```

Como los flows se referencian entre sí (welcome → confirmation → welcome si hay timeout), importarlos estáticamente crea un ciclo que Node no puede resolver. El import dinámico rompe ese ciclo porque la resolución ocurre cuando la función se ejecuta, no cuando el archivo se carga.

---

## `fallBack` — reintentar sin salir del flujo

```ts
// welcome.flow.ts
if (!valido) {
  await flowDynamic(ERROR_VALIDACION)
  return fallBack()  // repite el addAnswer anterior sin ir a otro flow
}
```

`fallBack` repite la pregunta actual. Se usa cuando la entrada del usuario es inválida y querés que reintente en el mismo paso, sin arrancar otro flujo ni perder el estado.

---

## Resumen de los helpers del callback

| Helper | Qué hace |
|---|---|
| `ctx.body` | Texto que escribió el usuario |
| `state.update({})` | Guarda datos en la sesión |
| `state.get('campo')` | Lee un dato de la sesión |
| `flowDynamic('texto')` | Envía un mensaje en medio de la lógica |
| `gotoFlow(flow)` | Salta a otro flujo (siempre con `return`) |
| `fallBack()` | Repite la pregunta actual |
