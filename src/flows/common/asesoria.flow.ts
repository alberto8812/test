import { addKeyword, EVENTS } from '@builderbot/bot'
import type { MetaProvider } from '@builderbot/provider-meta'
import type { MysqlAdapter } from '@builderbot/database-mysql'
import { verificarTimeout, validarDatosUsuario, validarEmpresaSeleccionada, volverOSalir } from '../../services/session.service'

export const asesoriaFlow = addKeyword<MetaProvider, MysqlAdapter>(EVENTS.ACTION)
  .addAnswer('', {}, async (_ctx, { state, flowDynamic, gotoFlow }) => {
    const { welcomeFlow } = await import('./welcome.flow')
    const { flujoSeleccionEmpresa } = await import('./company-selection.flow')
    if (!(await verificarTimeout(state, flowDynamic))) return gotoFlow(welcomeFlow)
    if (!(await validarDatosUsuario(state, flowDynamic))) return gotoFlow(welcomeFlow)
    if (!(await validarEmpresaSeleccionada(state, flowDynamic))) return gotoFlow(flujoSeleccionEmpresa)
  })
  .addAnswer('💬 *Asesoría Personalizada - NovaDesk*')
  .addAnswer([
    'Nuestro equipo especializado está disponible para atenderte.', '',
    '📱 *Comunícate con nosotros por WhatsApp:*',
    '👉 https://api.whatsapp.com/send?phone=573126134238', '',
    '⏰ *Horario de atención:* Lunes a Viernes: 8:00 AM - 5:30 PM',
  ].join('\n'))
  .addAnswer(
    '¿Deseas volver al menú principal o finalizar?',
    { buttons: [{ body: '⬅️Volver al menu' }, { body: '✅Finalizar' }], capture: true },
    async (ctx, { gotoFlow, flowDynamic, state }) => {
      const { welcomeFlow } = await import('./welcome.flow')
      return volverOSalir(ctx, gotoFlow, flowDynamic, state, welcomeFlow)
    },
  )
