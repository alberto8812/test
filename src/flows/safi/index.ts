import { addKeyword, EVENTS } from '@builderbot/bot'
import type { MetaProvider } from '@builderbot/provider-meta'
import type { MysqlAdapter } from '@builderbot/database-mysql'

export const requerimientoSafiFlow = addKeyword<MetaProvider, MysqlAdapter>(EVENTS.ACTION).addAnswer(
  ['Por favor selecciona:', '', '1️⃣ Cambio de contraseña', '2️⃣ Limpiar IMEI',
    '3️⃣ Crear un nuevo empleado', '4️⃣ Otro', '', 'Digite el número:'].join('\n'),
  { capture: true },
  async (ctx, { gotoFlow, state, flowDynamic }) => {
    const op = ctx.body.trim()
    if (op === '1') {
      await state.update({ tipoRequerimiento: 'Cambio de contraseña' })
      const { cambioPasswordImeiFlow } = await import('./req-password.flow')
      return gotoFlow(cambioPasswordImeiFlow)
    }
    if (op === '2') {
      await state.update({ tipoRequerimiento: 'Limpiar IMEI' })
      const { limpiarIMEIFlow } = await import('./req-imei.flow')
      return gotoFlow(limpiarIMEIFlow)
    }
    if (op === '3') {
      await state.update({ tipoRequerimiento: 'Crear un nuevo empleado' })
      const { nuevoEmpleadoFlow } = await import('./req-employee.flow')
      return gotoFlow(nuevoEmpleadoFlow)
    }
    if (op === '4') {
      await state.update({ tipoRequerimiento: 'Otro' })
      const { otroRequerimientoFlow } = await import('./req-other.flow')
      return gotoFlow(otroRequerimientoFlow)
    }
    await flowDynamic('❌ Opción no válida. Digite 1, 2, 3 o 4.')
  },
)
