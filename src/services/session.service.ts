import { sanitizeInput } from '../utils/sanitizers'
import { BotLogger } from '../utils/logger'
import { sendEmail } from './email.service'

const TIMEOUT_MINUTES = 15

const MENSAJES = {
  SESION_EXPIRADA: '⏱️ Tu sesión expiró por inactividad. Iniciemos de nuevo.',
  EMPRESA_REQUERIDA: '⚠️ Debes seleccionar una empresa primero.',
  DATOS_REQUERIDOS: '⚠️ Debes proporcionar tus datos primero.',
}

export async function verificarTimeout(state: any, flowDynamic: any): Promise<boolean> {
  try {
    const ultimaActividad = await state.get('ultimaActividad')
    if (ultimaActividad) {
      const minutos = (Date.now() - ultimaActividad) / (1000 * 60)
      if (minutos > TIMEOUT_MINUTES) {
        await flowDynamic(MENSAJES.SESION_EXPIRADA)
        await resetState(state)
        return false
      }
    }
    await state.update({ ultimaActividad: Date.now() })
    return true
  } catch { return true }
}

export async function validarEmpresaSeleccionada(state: any, flowDynamic: any): Promise<boolean> {
  if (!(await state.get('empresa'))) {
    await flowDynamic(MENSAJES.EMPRESA_REQUERIDA)
    return false
  }
  return true
}

export async function validarDatosUsuario(state: any, flowDynamic: any): Promise<boolean> {
  const ok = (await state.get('datosUsuario')) && (await state.get('nombreUsuario')) && (await state.get('emailUsuario'))
  if (!ok) { await flowDynamic(MENSAJES.DATOS_REQUERIDOS); return false }
  return true
}

export async function resetState(state: any): Promise<boolean> {
  if (!state) return false
  try {
    if (typeof state.clear === 'function') { await state.clear(); return true }
  } catch { }
  try {
    const keys = [
      'datosUsuario', 'nombreUsuario', 'emailUsuario', 'empresa',
      'tipoRequerimiento', 'tipoRequerimientoNovahold', 'tipoIncidente',
      'correo', 'imei', 'usuarioSistema', 'datosNuevoEmpleado',
      'descripcionOtro', 'novCargoArea', 'novCorreoElectronico',
      'novPCSpecs', 'novDescripcion', 'novIncidenteDetalle',
      'ultimaActividad', 'sesionValidada',
    ]
    await state.update(Object.fromEntries(keys.map((k) => [k, null])))
    return true
  } catch (err) {
    BotLogger.error('❌ No se pudo reiniciar el state', err)
    return false
  }
}

export async function armarResumen(state: any): Promise<string> {
  const g = (k: string) => state.get(k)
  const nombre = (await g('nombreUsuario')) || 'No registrado'
  const email = (await g('emailUsuario')) || 'No registrado'
  const empresa = (await g('empresa')) || 'No registrada'
  const tipo = (await g('tipoRequerimiento')) || (await g('tipoRequerimientoNovahold')) || 'No registrado'
  const campos = [
    ['usuarioSistema', '🔑 Usuario'],
    ['datosNuevoEmpleado', '🆕 Datos nuevo empleado'],
    ['descripcionOtro', '📝 Descripción'],
    ['novCargoArea', '👔 Cargo/Área'],
    ['novCorreoElectronico', '✉️ Correo'],
    ['novPCSpecs', '🖥️ Especificaciones PC'],
    ['novDescripcion', '📝 Descripción'],
    ['novIncidenteDetalle', '📝 Detalle'],
    ['correo', '📧 Correo'],
    ['imei', '📱 IMEI'],
  ]
  let extra = ''
  for (const [key, label] of campos) {
    const val = await g(key)
    if (val) extra += `${label}: ${sanitizeInput(val, 500)}\n`
  }
  return (
    `📋 *Resumen de datos enviados:*\n\n` +
    `👤 Nombre: ${sanitizeInput(nombre)}\n` +
    `✉️ Email: ${sanitizeInput(email)}\n` +
    `🏢 Empresa: ${empresa}\n` +
    `📂 Tipo de requerimiento: ${tipo}\n` +
    `${extra}` +
    `⏰ Fecha: ${new Date().toLocaleString('es-CO')}\n`
  )
}

export async function enviarMensajeDividido(flowDynamic: any, texto: string): Promise<void> {
  const { dividirMensaje } = await import('../utils/sanitizers')
  for (const m of dividirMensaje(texto)) {
    await flowDynamic(m)
    await new Promise((r) => setTimeout(r, 500))
  }
}

export async function finalizarConMenu(state: any, flowDynamic: any, _gotoFlow: any, asunto: string, userId: string): Promise<void> {
  const resumen = await armarResumen(state)
  const nombre = (await state.get('nombreUsuario')) || 'usuario'
  await flowDynamic(`🎯 *Resumen final de tu solicitud:*`)
  await enviarMensajeDividido(flowDynamic, resumen)
  BotLogger.info('🔍 Acción registrada', { userId, accion: 'FINALIZACION', asunto, empresa: await state.get('empresa') })
  const ok = await sendEmail(asunto, resumen)
  const EXITO = '✅ ¡Tus datos se enviaron correctamente'
  const ERROR = '⚠️ Hubo un problema al enviar el correo. Tu solicitud fue registrada y será procesada manualmente.'
  await flowDynamic(ok ? `${EXITO}, ${nombre}! Nuestro equipo los revisará. 🙌` : ERROR)
  await resetState(state)
}

export async function volverOSalir(ctx: any, gotoFlow: any, flowDynamic: any, state: any, welcomeFlow: any): Promise<void> {
  const body = (ctx.body || '').toLowerCase()
  if (body.includes('volver') || body.includes('⬅️')) {
    await resetState(state)
    await flowDynamic('🔄 Volviendo al menú principal...')
    return gotoFlow(welcomeFlow)
  }
  await flowDynamic('¡Gracias por usar NovaDesk! 👋')
  await resetState(state)
}
