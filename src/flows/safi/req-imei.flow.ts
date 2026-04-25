import { addKeyword, EVENTS } from '@builderbot/bot'
import type { MetaProvider } from '@builderbot/provider-meta'
import type { MysqlAdapter } from '@builderbot/database-mysql'
import { sanitizeInput } from '../../utils/sanitizers'
import { validarEmail } from '../../utils/validators'
import { finalizarConMenu, volverOSalir } from '../../services/session.service'

export const limpiarIMEIFlow = addKeyword<MetaProvider, MysqlAdapter>(EVENTS.ACTION)
  .addAnswer('🔄 Vamos a gestionar la *limpieza de IMEI*.')
  .addAnswer('✉️ Por favor, indícame tu *correo electrónico corporativo*:',
    { capture: true },
    async (ctx, { state, flowDynamic, fallBack }) => {
      const correo = sanitizeInput(ctx.body)
      if (!validarEmail(correo)) { await flowDynamic('❌ Correo no válido. Intenta nuevamente.'); return fallBack() }
      await state.update({ correo })
    },
  )
  .addAnswer('📱 Escribe el *IMEI* que deseas limpiar:',
    { capture: true },
    async (ctx, { state }) => { await state.update({ imei: sanitizeInput(ctx.body) }) },
  )
  .addAnswer('', {}, async (ctx, { state, flowDynamic, gotoFlow }) => {
    await finalizarConMenu(state, flowDynamic, gotoFlow, 'Nueva solicitud SAFI - Limpiar IMEI', ctx.from)
  })
  .addAnswer('¿Deseas volver al menú principal?',
    { buttons: [{ body: '⬅️ Volver' }, { body: '✅ Salir' }], capture: true },
    async (ctx, { gotoFlow, flowDynamic, state }) => {
      const { welcomeFlow } = await import('../common/welcome.flow')
      return volverOSalir(ctx, gotoFlow, flowDynamic, state, welcomeFlow)
    },
  )
