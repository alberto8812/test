import { addKeyword, EVENTS } from '@builderbot/bot'
import type { MetaProvider } from '@builderbot/provider-meta'
import type { MysqlAdapter } from '@builderbot/database-mysql'
import { sanitizeInput } from '../../utils/sanitizers'
import { finalizarConMenu, volverOSalir } from '../../services/session.service'

export const novaholdReqOtroFlow = addKeyword<MetaProvider, MysqlAdapter>(EVENTS.ACTION)
  .addAnswer('Por favor, digite su *cargo y área*:',
    { capture: true },
    async (ctx, { state }) => { await state.update({ novCargoArea: sanitizeInput(ctx.body) }) },
  )
  .addAnswer('Indíquenos una *breve descripción* del requerimiento:',
    { capture: true },
    async (ctx, { state }) => { await state.update({ novDescripcion: sanitizeInput(ctx.body, 1000) }) },
  )
  .addAnswer('', {}, async (ctx, { state, flowDynamic, gotoFlow }) => {
    await finalizarConMenu(state, flowDynamic, gotoFlow, 'Nueva solicitud NOVAHOLD - Otro requerimiento', ctx.from)
  })
  .addAnswer('¿Deseas volver al menú principal?',
    { buttons: [{ body: '⬅️ Volver' }, { body: '✅ Salir' }], capture: true },
    async (ctx, { gotoFlow, flowDynamic, state }) => {
      const { welcomeFlow } = await import('../common/welcome.flow')
      return volverOSalir(ctx, gotoFlow, flowDynamic, state, welcomeFlow)
    },
  )
