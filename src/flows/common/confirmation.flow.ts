import { addKeyword, EVENTS } from '@builderbot/bot'
import type { MetaProvider } from '@builderbot/provider-meta'
import type { MysqlAdapter } from '@builderbot/database-mysql'
import { verificarTimeout } from '../../services/session.service'
import { sanitizeInput } from '../../utils/sanitizers'
import { extraerDatosUsuario } from '../../utils/validators'

const ERROR_VALIDACION = '❌ Los datos no son válidos. Asegúrate de incluir:\n• Tu nombre completo (mínimo 3 caracteres)\n• Un correo electrónico válido'

export const flujoConfirmacionDatos = addKeyword<MetaProvider, MysqlAdapter>(EVENTS.ACTION).addAnswer(
  '¿Los datos anteriores son correctos?',
  { buttons: [{ body: '✅ Sí, continuar' }, { body: '❌ No, corregir' }], capture: true },
  async (ctx, { gotoFlow, flowDynamic, state }) => {
    const { welcomeFlow } = await import('./welcome.flow')
    if (!(await verificarTimeout(state, flowDynamic))) return gotoFlow(welcomeFlow)
    const op = ctx.body.toLowerCase()
    if (op.includes('sí') || op.includes('si') || op.includes('continuar')) {
      const { flujoSeleccionEmpresa } = await import('./company-selection.flow')
      return gotoFlow(flujoSeleccionEmpresa)
    }
    if (op.includes('no') || op.includes('corregir')) {
      await state.update({ datosUsuario: null, nombreUsuario: null, emailUsuario: null })
      return gotoFlow(flujoReingresoDatos)
    }
    await flowDynamic('⚠️ Por favor selecciona una opción usando los botones.')
  },
)

export const flujoReingresoDatos = addKeyword<MetaProvider, MysqlAdapter>(EVENTS.ACTION).addAnswer(
  '✏️ Por favor, vuelve a escribir tu *nombre completo* y *correo electrónico*:',
  { capture: true },
  async (ctx, { state, flowDynamic, gotoFlow, fallBack }) => {
    const { nombre, email, valido } = extraerDatosUsuario(sanitizeInput(ctx.body, 500))
    if (!valido) { await flowDynamic(ERROR_VALIDACION); return fallBack() }
    await state.update({ datosUsuario: ctx.body, nombreUsuario: nombre, emailUsuario: email, ultimaActividad: Date.now() })
    await flowDynamic(`✅ *Datos actualizados:*\n\n👤 Nombre: ${nombre}\n✉️ Email: ${email}`)
    return gotoFlow(flujoConfirmacionDatos)
  },
)
