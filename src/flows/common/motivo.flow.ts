import { addKeyword, EVENTS } from '@builderbot/bot'
import type { MetaProvider } from '@builderbot/provider-meta'
import type { MysqlAdapter } from '@builderbot/database-mysql'
import { verificarTimeout, validarEmpresaSeleccionada } from '../../services/session.service'

export const motivoContactoFlow = addKeyword<MetaProvider, MysqlAdapter>(EVENTS.ACTION)
  .addAnswer('', {}, async (_, { state, flowDynamic, gotoFlow }) => {
    const { welcomeFlow } = await import('./welcome.flow')
    const { flujoSeleccionEmpresa } = await import('./company-selection.flow')
    if (!(await verificarTimeout(state, flowDynamic))) return gotoFlow(welcomeFlow)
    if (!(await validarEmpresaSeleccionada(state, flowDynamic))) return gotoFlow(flujoSeleccionEmpresa)
  })
  .addAnswer(
    '🧐 ¿Cuál es el motivo de tu contacto?',
    { buttons: [{ body: '🔴 Incidente' }, { body: '📋 Requerimiento' }, { body: '💬 Asesoría' }], capture: true },
    async (ctx, { gotoFlow, state, flowDynamic }) => {
      const op = ctx.body.toLowerCase().trim()
      const empresa = ((await state.get('empresa')) || '').toLowerCase()
      await state.update({ ultimaActividad: Date.now() })
      if (op.includes('incidente') || op.includes('🔴')) {
        const { novaholdIncidenteFlow } = await import('../novahold/incident.flow')
        const { incidenteFlow } = await import('../safi/incident.flow')
        return gotoFlow(empresa === 'novahold' ? novaholdIncidenteFlow : incidenteFlow)
      }
      if (op.includes('requerimiento') || op.includes('📋')) {
        const { requerimientoFlow } = await import('./motivo.flow')
        return gotoFlow(requerimientoFlow)
      }
      if (op.includes('asesoría') || op.includes('asesoria') || op.includes('💬')) {
        const { asesoriaFlow } = await import('./asesoria.flow')
        return gotoFlow(asesoriaFlow)
      }
      await flowDynamic('⚠️ Opción no válida. Por favor selecciona una opción válida.')
    },
  )

export const requerimientoFlow = addKeyword<MetaProvider, MysqlAdapter>(EVENTS.ACTION)
  .addAnswer('✅ Elegiste *Requerimiento*', {},
    async (_, { state, gotoFlow, flowDynamic }) => {
      const empresa = (await state.get('empresa') || '').toLowerCase()
      if (empresa === 'safi') {
        await flowDynamic('✅ Con empresa *Safi*')
        const { requerimientoSafiFlow } = await import('../safi/index')
        return gotoFlow(requerimientoSafiFlow)
      }
      if (empresa === 'novahold') {
        await flowDynamic('✅ Con empresa *Novahold*')
        const { requerimientoNovaholdFlow } = await import('../novahold/index')
        return gotoFlow(requerimientoNovaholdFlow)
      }
      await flowDynamic('⚠️ Empresa no reconocida. Por favor reinicia el proceso.')
    },
  )
