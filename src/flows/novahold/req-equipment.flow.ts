import { addKeyword, EVENTS } from '@builderbot/bot'
import type { MetaProvider } from '@builderbot/provider-meta'
import type { MysqlAdapter } from '@builderbot/database-mysql'
import { sanitizeInput } from '../../utils/sanitizers'
import { finalizarConMenu, volverOSalir } from '../../services/session.service'

export const novaholdReqEquiposFlow = addKeyword<MetaProvider, MysqlAdapter>(EVENTS.ACTION)
  .addAnswer('Por favor, digite su *cargo y área*:',
    { capture: true },
    async (ctx, { state }) => { await state.update({ novCargoArea: sanitizeInput(ctx.body) }) },
  )
  .addAnswer(['Ahora, las *características de su computador*:', '',
    '• Memoria RAM', '• Procesador', '• Almacenamiento', '• Tipo de sistema (32/64 bits)'].join('\n'))
  .addAnswer(['💡 *¿Cómo ver esta información?*', '',
    '1️⃣ Presione *Windows + R*', '2️⃣ Escriba `dxdiag` → *Enter*',
    '3️⃣ Verá Procesador, Memoria y Tipo de sistema',
    '4️⃣ Almacenamiento: *Explorador de archivos* → *Este equipo*'].join('\n'))
  .addAnswer('Cuando tenga los datos, escríbalos aquí en un solo mensaje:',
    { capture: true },
    async (ctx, { state }) => { await state.update({ novPCSpecs: sanitizeInput(ctx.body, 1000) }) },
  )
  .addAnswer('', {}, async (ctx, { state, flowDynamic, gotoFlow }) => {
    await finalizarConMenu(state, flowDynamic, gotoFlow, 'Nueva solicitud NOVAHOLD - Solicitud de equipos', ctx.from)
  })
  .addAnswer('¿Deseas volver al menú principal?',
    { buttons: [{ body: '⬅️ Volver' }, { body: '✅ Salir' }], capture: true },
    async (ctx, { gotoFlow, flowDynamic, state }) => {
      const { welcomeFlow } = await import('../common/welcome.flow')
      return volverOSalir(ctx, gotoFlow, flowDynamic, state, welcomeFlow)
    },
  )
