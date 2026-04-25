import { addKeyword, EVENTS } from '@builderbot/bot'
import type { MetaProvider } from '@builderbot/provider-meta'
import type { MysqlAdapter } from '@builderbot/database-mysql'

export const requerimientoNovaholdFlow = addKeyword<MetaProvider, MysqlAdapter>(EVENTS.ACTION)
  .addAnswer('📂 *REQUERIMIENTO - NOVAHOLD*')
  .addAnswer(
    ['Por favor selecciona:', '', '1️⃣ Cambio de contraseña correo electrónico',
      '2️⃣ Solicitud de equipos', '3️⃣ Otro', '', 'Digite el número:'].join('\n'),
    { capture: true },
    async (ctx, { gotoFlow, state, flowDynamic }) => {
      const op = ctx.body.trim()
      if (op === '1') {
        await state.update({ tipoRequerimientoNovahold: 'Cambio de contraseña correo electrónico' })
        const { novaholdReqCambioPassFlow } = await import('./req-password.flow')
        return gotoFlow(novaholdReqCambioPassFlow)
      }
      if (op === '2') {
        await state.update({ tipoRequerimientoNovahold: 'Solicitud de equipos' })
        const { novaholdReqEquiposFlow } = await import('./req-equipment.flow')
        return gotoFlow(novaholdReqEquiposFlow)
      }
      if (op === '3') {
        await state.update({ tipoRequerimientoNovahold: 'Otro' })
        const { novaholdReqOtroFlow } = await import('./req-other.flow')
        return gotoFlow(novaholdReqOtroFlow)
      }
      await flowDynamic('❌ Opción no válida. Digite 1, 2 o 3.')
    },
  )
