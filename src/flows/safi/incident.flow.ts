import { addKeyword, EVENTS } from '@builderbot/bot'
import type { MetaProvider } from '@builderbot/provider-meta'
import type { MysqlAdapter } from '@builderbot/database-mysql'

export const incidenteFlow = addKeyword<MetaProvider, MysqlAdapter>(EVENTS.ACTION)
  .addAnswer('✅ Elegiste *Incidente*')
  .addAnswer(
    ['Por favor selecciona:', '', '1️⃣ Desbloquear usuario', '2️⃣ No puedo operar', '', 'Digite el número:'].join('\n'),
    { capture: true },
    async (ctx, { gotoFlow, state, flowDynamic }) => {
      if (ctx.body.trim() === '1') {
        await state.update({ tipoIncidente: 'Desbloquear usuario' })
        const { desbloquearUsuarioFlow } = await import('./req-unlock.flow')
        return gotoFlow(desbloquearUsuarioFlow)
      }
      if (ctx.body.trim() === '2') {
        await state.update({ tipoIncidente: 'No puedo operar en Safi' })
        const { noPuedoOperarFlow } = await import('./req-no-operar.flow')
        return gotoFlow(noPuedoOperarFlow)
      }
      await flowDynamic('❌ Opción no válida. Digite 1 o 2.')
    },
  )
