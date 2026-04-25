import { addKeyword, EVENTS } from '@builderbot/bot'
import type { MetaProvider } from '@builderbot/provider-meta'
import type { MysqlAdapter } from '@builderbot/database-mysql'
import { verificarTimeout, validarDatosUsuario } from '../../services/session.service'

const EMPRESAS = { SAFI: 'Safi', NOVAHOLD: 'Novahold' } as const

export const flujoSeleccionEmpresa = addKeyword<MetaProvider, MysqlAdapter>(EVENTS.ACTION)
  .addAnswer('', {}, async (_, { state, flowDynamic, gotoFlow }) => {
    const { welcomeFlow } = await import('./welcome.flow')
    if (!(await verificarTimeout(state, flowDynamic))) return gotoFlow(welcomeFlow)
    if (!(await validarDatosUsuario(state, flowDynamic))) return gotoFlow(welcomeFlow)
  })
  .addAnswer(
    '👍 Perfecto. ¿Requieres soporte de *Safi* o de *Novahold*?',
    { buttons: [{ body: '📌 Safi' }, { body: '🏢 Novahold' }], capture: true },
    async (ctx, { flowDynamic, state, gotoFlow }) => {
      const op = ctx.body.toLowerCase().trim()
      const { motivoContactoFlow } = await import('./motivo.flow')
      if (op.includes('safi') || op.includes('📌')) {
        await state.update({ empresa: EMPRESAS.SAFI, ultimaActividad: Date.now() })
        await flowDynamic(`✅ Has seleccionado: *${EMPRESAS.SAFI}*`)
        return gotoFlow(motivoContactoFlow)
      }
      if (op.includes('novahold') || op.includes('🏢')) {
        await state.update({ empresa: EMPRESAS.NOVAHOLD, ultimaActividad: Date.now() })
        await flowDynamic(`✅ Has seleccionado: *${EMPRESAS.NOVAHOLD}*`)
        return gotoFlow(motivoContactoFlow)
      }
      await flowDynamic('❌ Opción no válida. Por favor selecciona usando los botones.')
    },
  )
