import { addKeyword, EVENTS } from '@builderbot/bot'
import type { MetaProvider } from '@builderbot/provider-meta'
import type { MysqlAdapter } from '@builderbot/database-mysql'
import { sanitizeInput } from '../../utils/sanitizers'
import { verificarTimeout, validarDatosUsuario, validarEmpresaSeleccionada, finalizarConMenu, volverOSalir } from '../../services/session.service'

export const desbloquearUsuarioFlow = addKeyword<MetaProvider, MysqlAdapter>(EVENTS.ACTION)
  .addAnswer('', {}, async (_ctx, { state, flowDynamic, gotoFlow }) => {
    const { welcomeFlow } = await import('../common/welcome.flow')
    const { flujoSeleccionEmpresa } = await import('../common/company-selection.flow')
    if (!(await verificarTimeout(state, flowDynamic))) return gotoFlow(welcomeFlow)
    if (!(await validarDatosUsuario(state, flowDynamic))) return gotoFlow(welcomeFlow)
    if (!(await validarEmpresaSeleccionada(state, flowDynamic))) return gotoFlow(flujoSeleccionEmpresa)
  })
  .addAnswer('Por favor, digita tu *usuario del sistema*:',
    { capture: true },
    async (ctx, { state }) => { await state.update({ usuarioSistema: sanitizeInput(ctx.body) }) },
  )
  .addAnswer('', {}, async (ctx, { state, flowDynamic, gotoFlow }) => {
    await finalizarConMenu(state, flowDynamic, gotoFlow, 'Nueva solicitud SAFI - Incidente: Desbloquear usuario', ctx.from)
  })
  .addAnswer('¿Deseas volver al menú principal?',
    { buttons: [{ body: '⬅️ Volver' }, { body: '✅ Salir' }], capture: true },
    async (ctx, { gotoFlow, flowDynamic, state }) => {
      const { welcomeFlow } = await import('../common/welcome.flow')
      return volverOSalir(ctx, gotoFlow, flowDynamic, state, welcomeFlow)
    },
  )
