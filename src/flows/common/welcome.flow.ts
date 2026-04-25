import { addKeyword } from '@builderbot/bot'
import type { MetaProvider } from '@builderbot/provider-meta'
import type { MysqlAdapter } from '@builderbot/database-mysql'
import { sanitizeInput } from '../../utils/sanitizers'
import { extraerDatosUsuario } from '../../utils/validators'

const ERROR_VALIDACION = '❌ Los datos no son válidos. Asegúrate de incluir:\n• Tu nombre completo (mínimo 3 caracteres)\n• Un correo electrónico válido'

export const welcomeFlow = addKeyword<MetaProvider, MysqlAdapter>([
  'hola', 'hi', 'hello', 'buenos dias', 'buenas tardes', 'buenas noches',
])
  .addAnswer('👋 ¡Hola! Soy *NovaDesk*!')
  .addAnswer(
    ['Para ayudarte mejor, necesito que me proporciones:', '',
      '📝 *Nombre completo*', '✉️ *Correo electrónico*', '',
      'Por favor escríbelos en un solo mensaje.', '',
      '💡 Ejemplo:', 'Juan Pérez Gómez', 'juan.perez@empresa.com'].join('\n'),
    { capture: true },
    async (ctx, { state, flowDynamic, gotoFlow, fallBack }) => {
      const { nombre, email, valido } = extraerDatosUsuario(sanitizeInput(ctx.body, 500))
      if (!valido) { await flowDynamic(ERROR_VALIDACION); return fallBack() }
      await state.update({ datosUsuario: ctx.body, nombreUsuario: nombre, emailUsuario: email, ultimaActividad: Date.now(), sesionValidada: true })
      await flowDynamic(`✅ *Datos recibidos:*\n\n👤 Nombre: ${nombre}\n✉️ Email: ${email}`)
      const { flujoConfirmacionDatos } = await import('./confirmation.flow')
      return gotoFlow(flujoConfirmacionDatos)
    },
  )
