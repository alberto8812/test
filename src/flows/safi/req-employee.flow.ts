import { addKeyword, EVENTS } from '@builderbot/bot'
import type { MetaProvider } from '@builderbot/provider-meta'
import type { MysqlAdapter } from '@builderbot/database-mysql'
import { sanitizeInput } from '../../utils/sanitizers'
import { finalizarConMenu, volverOSalir } from '../../services/session.service'

export const nuevoEmpleadoFlow = addKeyword<MetaProvider, MysqlAdapter>(EVENTS.ACTION)
  .addAnswer(
    ['Por favor, digita estos datos en un solo mensaje:', '',
      '*Nombre completo*', '*Fecha de nacimiento*', '*Cargo*',
      '*Sucursal*', '*Usuario*', '*Correo electrónico*'].join('\n'),
    { capture: true },
    async (ctx, { state, flowDynamic }) => {
      await state.update({ datosNuevoEmpleado: sanitizeInput(ctx.body, 1000) })
      await flowDynamic('⏳ Un momento por favor, estamos procesando tu información...')
    },
  )
  .addAnswer('', {}, async (ctx, { state, flowDynamic, gotoFlow }) => {
    await finalizarConMenu(state, flowDynamic, gotoFlow, 'Nueva solicitud SAFI - Crear nuevo empleado', ctx.from)
  })
  .addAnswer('¿Deseas volver al menú principal?',
    { buttons: [{ body: '⬅️ Volver' }, { body: '✅ Salir' }], capture: true },
    async (ctx, { gotoFlow, flowDynamic, state }) => {
      const { welcomeFlow } = await import('../common/welcome.flow')
      return volverOSalir(ctx, gotoFlow, flowDynamic, state, welcomeFlow)
    },
  )
