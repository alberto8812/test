import { addKeyword, createFlow, EVENTS } from "@builderbot/bot";
import nodemailer from "nodemailer";
import { validateEmailEnv } from "./config";

// ============================================
// TIPOS Y CONSTANTES
// ============================================
type Provider = any;
type Database = any;

interface DatosUsuario {
  nombre: string;
  email: string;
  valido: boolean;
}

const MENSAJES = {
  ERROR_VALIDACION:
    "❌ Los datos no son válidos. Asegúrate de incluir:\n• Tu nombre completo (mínimo 3 caracteres)\n• Un correo electrónico válido",
  OPCION_INVALIDA: "⚠️ Opción no válida. Por favor selecciona una opción válida.",
  EXITO_ENVIO: "✅ ¡Tus datos se enviaron correctamente",
  ERROR_ENVIO: "⚠️ Hubo un problema al enviar el correo. Tu solicitud fue registrada y será procesada manualmente.",
  DESPEDIDA: "¡Gracias por usar NovaDesk! 👋",
  PROCESANDO: "⏳ Un momento por favor, estamos procesando tu información...",
  SESION_EXPIRADA: "⏱️ Tu sesión expiró por inactividad. Iniciemos de nuevo.",
  EMPRESA_REQUERIDA: "⚠️ Debes seleccionar una empresa primero.",
  DATOS_REQUERIDOS: "⚠️ Debes proporcionar tus datos primero.",
};

const EMPRESAS = { SAFI: "Safi", NOVAHOLD: "Novahold" } as const;
const TIMEOUT_MINUTES = 15;
const MAX_REINTENTOS_EMAIL = 3;

// ============================================
// LOGGER
// ============================================
class BotLogger {
  private static log(level: string, message: string, data?: any) {
    console.log(`[${new Date().toISOString()}] [${level}] ${message}`, data ? JSON.stringify(data) : "");
  }
  static info(msg: string, data?: any) { this.log("INFO", msg, data); }
  static error(msg: string, err?: any) { this.log("ERROR", msg, err); }
  static success(msg: string, data?: any) { this.log("SUCCESS", msg, data); }
  static warning(msg: string, data?: any) { this.log("WARNING", msg, data); }
}

// ============================================
// AUDITORÍA
// ============================================
async function registrarAccion(userId: string, accion: string, datos: any): Promise<void> {
  BotLogger.info("🔍 Acción registrada", { userId, accion, datos, timestamp: new Date().toISOString() });
}

// ============================================
// VALIDACIONES
// ============================================
function validarEmail(email: string): boolean {
  const emailLimpio = email.trim().toLowerCase();
  if (emailLimpio.length > 254) return false;
  if (emailLimpio.startsWith(".") || emailLimpio.endsWith(".")) return false;
  if (emailLimpio.includes("..")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio);
}

function validarNombre(nombre: string): boolean {
  const n = nombre.trim();
  if (n.length < 3) return false;
  if (/^\d+$/.test(n)) return false;
  return /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(n);

}

function extraerDatosUsuario(texto: string): DatosUsuario {
  const emailMatch = texto.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  const email = emailMatch ? emailMatch[0].trim() : "";
  const nombre = texto.replace(email, "").trim().replace(/\s+/g, " ");
  const valido = validarEmail(email) && validarNombre(nombre);
  if (!valido) BotLogger.warning("Validación falló", { nombre, email });
  return { nombre, email, valido };
}

// ============================================
// SANITIZACIÓN
// ============================================
function sanitizeForEmail(text: string): string {
  if (!text) return "";
  return text
    .replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;").replace(/`/g, "&#x60;").trim();
}

function sanitizeInput(text: string, maxLength = 1000): string {
  if (!text) return "";
  return text.substring(0, maxLength).trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

// ============================================
// SESIONES Y VALIDACIONES DE ESTADO
// ============================================
async function verificarTimeout(state: any, flowDynamic: any): Promise<boolean> {
  try {
    const ultimaActividad = await state.get("ultimaActividad");
    if (ultimaActividad) {
      const minutos = (Date.now() - ultimaActividad) / (1000 * 60);
      if (minutos > TIMEOUT_MINUTES) {
        await flowDynamic(MENSAJES.SESION_EXPIRADA);
        await resetState(state);
        return false;
      }
    }
    await state.update({ ultimaActividad: Date.now() });
    return true;
  } catch { return true; }
}

async function validarEmpresaSeleccionada(state: any, flowDynamic: any): Promise<boolean> {
  if (!(await state.get("empresa"))) {
    await flowDynamic(MENSAJES.EMPRESA_REQUERIDA);
    return false;
  }
  return true;
}

async function validarDatosUsuario(state: any, flowDynamic: any): Promise<boolean> {
  const ok = (await state.get("datosUsuario")) && (await state.get("nombreUsuario")) && (await state.get("emailUsuario"));
  if (!ok) { await flowDynamic(MENSAJES.DATOS_REQUERIDOS); return false; }
  return true;
}

// ============================================
// RESET DE ESTADO
// ============================================
async function resetState(state: any): Promise<boolean> {
  if (!state) return false;
  try {
    if (typeof state.clear === "function") {
      await state.clear();
      return true;
    }
  } catch { }
  try {
    const keys = [
      "datosUsuario", "nombreUsuario", "emailUsuario", "empresa",
      "tipoRequerimiento", "tipoRequerimientoNovahold", "tipoIncidente",
      "correo", "imei", "usuarioSistema", "datosNuevoEmpleado",
      "descripcionOtro", "novCargoArea", "novCorreoElectronico",
      "novPCSpecs", "novDescripcion", "novIncidenteDetalle",
      "ultimaActividad", "sesionValidada",
    ];
    await state.update(Object.fromEntries(keys.map((k) => [k, null])));
    return true;
  } catch (err) {
    BotLogger.error("❌ No se pudo reiniciar el state", err);
    return false;
  }
}

// ============================================
// ENVÍO DE EMAIL
// ============================================
export async function sendEmail(subject: string, body: string, maxReintentos = MAX_REINTENTOS_EMAIL): Promise<boolean> {
  try { validateEmailEnv(); } catch (e) { BotLogger.error("Config email inválida", e); return false; }

  for (let i = 1; i <= maxReintentos; i++) {
    try {
      const t = nodemailer.createTransport({
        host: "smtp.office365.com", port: 587, secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        //    tls: { ciphers: "SSLv3", rejectUnauthorized: false },
        tls: { ciphers: "TLSv1.2", rejectUnauthorized: true },
      });
      await t.sendMail({
        from: process.env.EMAIL_USER, to: process.env.EMAIL_TO,
        subject: sanitizeForEmail(subject),
        text: sanitizeForEmail(body),
        html: `<pre style="font-family:monospace;white-space:pre-wrap;">${sanitizeForEmail(body)}</pre>`,
      });
      BotLogger.success("📧 Correo enviado", { subject, intento: i });
      return true;
    } catch (e) {
      BotLogger.error(`Error intento ${i}/${maxReintentos}`, e);
      if (i < maxReintentos) await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  return false;
}

// ============================================
// HELPERS
// ============================================
function dividirMensaje(texto: string, max = 1500): string[] {
  if (texto.length <= max) return [texto];
  const msgs: string[] = [];
  let i = 0;
  while (i < texto.length) {
    let fin = i + max;
    if (fin < texto.length) { const s = texto.lastIndexOf("\n", fin); if (s > i) fin = s; }
    msgs.push(texto.substring(i, fin).trim());
    i = fin + 1;
  }
  return msgs;
}

async function enviarMensajeDividido(flowDynamic: any, texto: string): Promise<void> {
  for (const m of dividirMensaje(texto)) {
    await flowDynamic(m);
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function armarResumen(state: any): Promise<string> {
  const g = (k: string) => state.get(k);
  const nombre = (await g("nombreUsuario")) || "No registrado";
  const email = (await g("emailUsuario")) || "No registrado";
  const empresa = (await g("empresa")) || "No registrada";
  const tipo = (await g("tipoRequerimiento")) || (await g("tipoRequerimientoNovahold")) || "No registrado";
  const campos = [
    ["usuarioSistema", "🔑 Usuario"],
    ["datosNuevoEmpleado", "🆕 Datos nuevo empleado"],
    ["descripcionOtro", "📝 Descripción"],
    ["novCargoArea", "👔 Cargo/Área"],
    ["novCorreoElectronico", "✉️ Correo"],
    ["novPCSpecs", "🖥️ Especificaciones PC"],
    ["novDescripcion", "📝 Descripción"],
    ["novIncidenteDetalle", "📝 Detalle"],
    ["correo", "📧 Correo"],
    ["imei", "📱 IMEI"],
  ];
  let extra = "";
  for (const [key, label] of campos) {
    const val = await g(key);
    if (val) extra += `${label}: ${sanitizeInput(val, 500)}\n`;
  }
  return (
    `📋 *Resumen de datos enviados:*\n\n` +
    `👤 Nombre: ${sanitizeInput(nombre)}\n` +
    `✉️ Email: ${sanitizeInput(email)}\n` +
    `🏢 Empresa: ${empresa}\n` +
    `📂 Tipo de requerimiento: ${tipo}\n` +
    `${extra}` +
    `⏰ Fecha: ${new Date().toLocaleString("es-CO")}\n`
  );
}

async function finalizarConMenu(state: any, flowDynamic: any, _gotoFlow: any, asunto: string, userId: string): Promise<void> {
  const resumen = await armarResumen(state);
  const nombre = (await state.get("nombreUsuario")) || "usuario";
  await flowDynamic(`🎯 *Resumen final de tu solicitud:*`);
  await enviarMensajeDividido(flowDynamic, resumen);
  await registrarAccion(userId, "FINALIZACION", { asunto, empresa: await state.get("empresa") });
  const ok = await sendEmail(asunto, resumen);
  await flowDynamic(ok ? `${MENSAJES.EXITO_ENVIO}, ${nombre}! Nuestro equipo los revisará. 🙌` : MENSAJES.ERROR_ENVIO);
  await resetState(state);
}

// Helper reutilizable para menú final Volver/Salir
async function volverOSalir(ctx: any, gotoFlow: any, flowDynamic: any, state: any): Promise<void> {
  const body = (ctx.body || "").toLowerCase();
  if (body.includes("volver") || body.includes("⬅️")) {
    await resetState(state);
    await flowDynamic("🔄 Volviendo al menú principal...");
    return gotoFlow(welcomeFlow);
  }
  await flowDynamic(MENSAJES.DESPEDIDA);
  await resetState(state);
}

// ============================================
// FLUJOS
// ============================================

/* WELCOME */
export const welcomeFlow = addKeyword<Provider, Database>([
  "hola", "hi", "hello", "buenos dias", "buenas tardes", "buenas noches",
])
  .addAnswer("👋 ¡Hola! Soy *NovaDesk*!")
  .addAnswer(
    ["Para ayudarte mejor, necesito que me proporciones:", "",
      "📝 *Nombre completo*", "✉️ *Correo electrónico*", "",
      "Por favor escríbelos en un solo mensaje.", "",
      "💡 Ejemplo:", "Juan Pérez Gómez", "juan.perez@empresa.com"].join("\n"),
    { capture: true },
    async (ctx, { state, flowDynamic, gotoFlow, fallBack }) => {
      const { nombre, email, valido } = extraerDatosUsuario(sanitizeInput(ctx.body, 500));
      if (!valido) { await flowDynamic(MENSAJES.ERROR_VALIDACION); return fallBack(); }
      await state.update({ datosUsuario: ctx.body, nombreUsuario: nombre, emailUsuario: email, ultimaActividad: Date.now(), sesionValidada: true });
      await flowDynamic(`✅ *Datos recibidos:*\n\n👤 Nombre: ${nombre}\n✉️ Email: ${email}`);
      return gotoFlow(flujoConfirmacionDatos);
    },
  );

/* CONFIRMACIÓN */
export const flujoConfirmacionDatos = addKeyword(EVENTS.ACTION).addAnswer(
  "¿Los datos anteriores son correctos?",
  { buttons: [{ body: "✅ Sí, continuar" }, { body: "❌ No, corregir" }], capture: true },
  async (ctx, { gotoFlow, flowDynamic, state }) => {
    if (!(await verificarTimeout(state, flowDynamic))) return gotoFlow(welcomeFlow);
    const op = ctx.body.toLowerCase();
    if (op.includes("sí") || op.includes("si") || op.includes("continuar")) return gotoFlow(flujoSeleccionEmpresa);
    if (op.includes("no") || op.includes("corregir")) {
      await state.update({ datosUsuario: null, nombreUsuario: null, emailUsuario: null });
      return gotoFlow(flujoReingresoDatos);
    }
    await flowDynamic("⚠️ Por favor selecciona una opción usando los botones.");
  },
);

/* REINGRESO */
export const flujoReingresoDatos = addKeyword(EVENTS.ACTION).addAnswer(
  "✏️ Por favor, vuelve a escribir tu *nombre completo* y *correo electrónico*:",
  { capture: true },
  async (ctx, { state, flowDynamic, gotoFlow, fallBack }) => {
    const { nombre, email, valido } = extraerDatosUsuario(sanitizeInput(ctx.body, 500));
    if (!valido) { await flowDynamic(MENSAJES.ERROR_VALIDACION); return fallBack(); }
    await state.update({ datosUsuario: ctx.body, nombreUsuario: nombre, emailUsuario: email, ultimaActividad: Date.now() });
    await flowDynamic(`✅ *Datos actualizados:*\n\n👤 Nombre: ${nombre}\n✉️ Email: ${email}`);
    return gotoFlow(flujoConfirmacionDatos);
  },
);

/* SELECCIÓN EMPRESA */
export const flujoSeleccionEmpresa = addKeyword(EVENTS.ACTION)
  .addAnswer("", {}, async (_, { state, flowDynamic, gotoFlow }) => {
    if (!(await verificarTimeout(state, flowDynamic))) return gotoFlow(welcomeFlow);
    if (!(await validarDatosUsuario(state, flowDynamic))) return gotoFlow(welcomeFlow);
  })
  .addAnswer(
    "👍 Perfecto. ¿Requieres soporte de *Safi* o de *Novahold*?",
    { buttons: [{ body: "📌 Safi" }, { body: "🏢 Novahold" }], capture: true },
    async (ctx, { flowDynamic, state, gotoFlow }) => {
      const op = ctx.body.toLowerCase().trim();
      if (op.includes("safi") || op.includes("📌")) {
        await state.update({ empresa: EMPRESAS.SAFI, ultimaActividad: Date.now() });
        await flowDynamic(`✅ Has seleccionado: *${EMPRESAS.SAFI}*`);
        return gotoFlow(motivoContactoFlow);
      }
      if (op.includes("novahold") || op.includes("🏢")) {
        await state.update({ empresa: EMPRESAS.NOVAHOLD, ultimaActividad: Date.now() });
        await flowDynamic(`✅ Has seleccionado: *${EMPRESAS.NOVAHOLD}*`);
        return gotoFlow(motivoContactoFlow);
      }
      await flowDynamic("❌ Opción no válida. Por favor selecciona usando los botones.");
    },
  );

/* MOTIVO CONTACTO */
export const motivoContactoFlow = addKeyword(EVENTS.ACTION)
  .addAnswer("", {}, async (_, { state, flowDynamic, gotoFlow }) => {
    if (!(await verificarTimeout(state, flowDynamic))) return gotoFlow(welcomeFlow);
    if (!(await validarEmpresaSeleccionada(state, flowDynamic))) return gotoFlow(flujoSeleccionEmpresa);
  })
  .addAnswer(
    "🧐 ¿Cuál es el motivo de tu contacto?",
    { buttons: [{ body: "🔴 Incidente" }, { body: "📋 Requerimiento" }, { body: "💬 Asesoría" }], capture: true },
    async (ctx, { gotoFlow, state, flowDynamic }) => {
      const op = ctx.body.toLowerCase().trim();
      const empresa = ((await state.get("empresa")) || "").toLowerCase();
      await state.update({ ultimaActividad: Date.now() });
      if (op.includes("incidente") || op.includes("🔴")) {
        return gotoFlow(empresa === "novahold" ? novaholdIncidenteFlow : incidenteFlow);
      }
      if (op.includes("requerimiento") || op.includes("📋")) return gotoFlow(requerimientoFlow);
      if (op.includes("asesoría") || op.includes("asesoria") || op.includes("💬")) return gotoFlow(asesoriaFlow);
      await flowDynamic(MENSAJES.OPCION_INVALIDA);
    },
  );

/* ASESORÍA */
export const asesoriaFlow = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAnswer("", {}, async (_ctx, { state, flowDynamic, gotoFlow }) => {
    if (!(await verificarTimeout(state, flowDynamic))) return gotoFlow(welcomeFlow);
    if (!(await validarDatosUsuario(state, flowDynamic))) return gotoFlow(welcomeFlow);
    if (!(await validarEmpresaSeleccionada(state, flowDynamic))) return gotoFlow(flujoSeleccionEmpresa);
  })
  .addAnswer("💬 *Asesoría Personalizada - NovaDesk*")
  .addAnswer([
    "Nuestro equipo especializado está disponible para atenderte.", "",
    "📱 *Comunícate con nosotros por WhatsApp:*",
    "👉 https://api.whatsapp.com/send?phone=573126134238", "",
    "⏰ *Horario de atención:* Lunes a Viernes: 8:00 AM - 5:30 PM",
  ].join("\n"))
  .addAnswer(
    "¿Deseas volver al menú principal o finalizar?",
    { buttons: [{ body: "⬅️Volver al menu" }, { body: "✅Finalizar" }], capture: true },
    async (ctx, { gotoFlow, flowDynamic, state }) => volverOSalir(ctx, gotoFlow, flowDynamic, state),
  );

/* ============================================================
   ✅ FIX CRÍTICO: Los siguientes 4 flujos usaban addKeyword
   con strings en lugar de EVENTS.ACTION.
   Con gotoFlow() los keywords NO se activan → flujo se rompe.
   ============================================================ */

/* INCIDENTE SAFI - ✅ EVENTS.ACTION (antes: addKeyword("incidente")) */
export const incidenteFlow = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAnswer("✅ Elegiste *Incidente*")
  .addAnswer(
    ["Por favor selecciona:", "", "1️⃣ Desbloquear usuario", "2️⃣ No puedo operar", "", "Digite el número:"].join("\n"),
    { capture: true },
    async (ctx, { gotoFlow, state, flowDynamic }) => {
      if (ctx.body.trim() === "1") { await state.update({ tipoIncidente: "Desbloquear usuario" }); return gotoFlow(desbloquearUsuarioFlow); }
      if (ctx.body.trim() === "2") { await state.update({ tipoIncidente: "No puedo operar en Safi" }); return gotoFlow(noPuedoOperarFlow); }
      await flowDynamic("❌ Opción no válida. Digite 1 o 2.");
    },
  );

/* REQUERIMIENTO ROUTER - ✅ EVENTS.ACTION (antes: addKeyword("requerimiento")) */
export const requerimientoFlow = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAnswer("✅ Elegiste *Requerimiento*", {},
    async (_, { state, gotoFlow, flowDynamic }) => {
      const empresa = (await state.get("empresa") || "").toLowerCase();
      if (empresa === "safi") { await flowDynamic("✅ Con empresa *Safi*"); return gotoFlow(requerimientoSafiFlow); }
      if (empresa === "novahold") { await flowDynamic("✅ Con empresa *Novahold*"); return gotoFlow(requerimientoNovaholdFlow); }
      await flowDynamic("⚠️ Empresa no reconocida. Por favor reinicia el proceso.");
    },
  );

/* REQUERIMIENTOS SAFI */
export const requerimientoSafiFlow = addKeyword(EVENTS.ACTION).addAnswer(
  ["Por favor selecciona:", "", "1️⃣ Cambio de contraseña", "2️⃣ Limpiar IMEI",
    "3️⃣ Crear un nuevo empleado", "4️⃣ Otro", "", "Digite el número:"].join("\n"),
  { capture: true },
  async (ctx, { gotoFlow, state, flowDynamic }) => {
    const mapa: any = {
      "1": { tipo: "Cambio de contraseña", flow: cambioPasswordImeiFlow },
      "2": { tipo: "Limpiar IMEI", flow: limpiarIMEIFlow },
      "3": { tipo: "Crear un nuevo empleado", flow: nuevoEmpleadoFlow },
      "4": { tipo: "Otro", flow: otroRequerimientoFlow },
    };
    const op = ctx.body.trim();
    if (mapa[op]) { await state.update({ tipoRequerimiento: mapa[op].tipo }); return gotoFlow(mapa[op].flow); }
    await flowDynamic("❌ Opción no válida. Digite 1, 2, 3 o 4.");
  },
);

/* CAMBIO CONTRASEÑA - ✅ EVENTS.ACTION (antes: addKeyword(["cambio imei","cambio pass"])) */
export const cambioPasswordImeiFlow = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAnswer("🔑 Vamos a gestionar tu *Cambio de contraseña*")
  .addAnswer("✉️ Por favor, indícame tu *correo electrónico corporativo*:",
    { capture: true },
    async (ctx, { state, flowDynamic, fallBack }) => {
      const correo = sanitizeInput(ctx.body);
      if (!validarEmail(correo)) { await flowDynamic("❌ Correo no válido. Intenta nuevamente."); return fallBack(); }
      await state.update({ correo });
    },
  )
  .addAnswer("📱 Escribe tu *IMEI o usuario del sistema*:",
    { capture: true },
    async (ctx, { state }) => { await state.update({ imei: sanitizeInput(ctx.body) }); },
  )
  .addAnswer("", {}, async (ctx, { state, flowDynamic, gotoFlow }) => {
    await finalizarConMenu(state, flowDynamic, gotoFlow, "Nueva solicitud SAFI - Cambio de contraseña/IMEI", ctx.from);
  })
  .addAnswer("¿Deseas volver al menú principal?",
    { buttons: [{ body: "⬅️ Volver" }, { body: "✅ Salir" }], capture: true },
    async (ctx, { gotoFlow, flowDynamic, state }) => volverOSalir(ctx, gotoFlow, flowDynamic, state),
  );

/* LIMPIAR IMEI - ✅ EVENTS.ACTION (antes: addKeyword(["limpiar imei"])) */
export const limpiarIMEIFlow = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAnswer("🔄 Vamos a gestionar la *limpieza de IMEI*.")
  .addAnswer("✉️ Por favor, indícame tu *correo electrónico corporativo*:",
    { capture: true },
    async (ctx, { state, flowDynamic, fallBack }) => {
      const correo = sanitizeInput(ctx.body);
      if (!validarEmail(correo)) { await flowDynamic("❌ Correo no válido. Intenta nuevamente."); return fallBack(); }
      await state.update({ correo });
    },
  )
  .addAnswer("📱 Escribe el *IMEI* que deseas limpiar:",
    { capture: true },
    async (ctx, { state }) => { await state.update({ imei: sanitizeInput(ctx.body) }); },
  )
  .addAnswer("", {}, async (ctx, { state, flowDynamic, gotoFlow }) => {
    await finalizarConMenu(state, flowDynamic, gotoFlow, "Nueva solicitud SAFI - Limpiar IMEI", ctx.from);
  })
  .addAnswer("¿Deseas volver al menú principal?",
    { buttons: [{ body: "⬅️ Volver" }, { body: "✅ Salir" }], capture: true },
    async (ctx, { gotoFlow, flowDynamic, state }) => volverOSalir(ctx, gotoFlow, flowDynamic, state),
  );

/* NUEVO EMPLEADO */
export const nuevoEmpleadoFlow = addKeyword(EVENTS.ACTION)
  .addAnswer(
    ["Por favor, digita estos datos en un solo mensaje:", "",
      "*Nombre completo*", "*Fecha de nacimiento*", "*Cargo*",
      "*Sucursal*", "*Usuario*", "*Correo electrónico*"].join("\n"),
    { capture: true },
    async (ctx, { state, flowDynamic }) => {
      await state.update({ datosNuevoEmpleado: sanitizeInput(ctx.body, 1000) });
      await flowDynamic(MENSAJES.PROCESANDO);
    },
  )
  .addAnswer("", {}, async (ctx, { state, flowDynamic, gotoFlow }) => {
    await finalizarConMenu(state, flowDynamic, gotoFlow, "Nueva solicitud SAFI - Crear nuevo empleado", ctx.from);
  })
  .addAnswer("¿Deseas volver al menú principal?",
    { buttons: [{ body: "⬅️ Volver" }, { body: "✅ Salir" }], capture: true },
    async (ctx, { gotoFlow, flowDynamic, state }) => volverOSalir(ctx, gotoFlow, flowDynamic, state),
  );

/* OTRO REQUERIMIENTO SAFI */
export const otroRequerimientoFlow = addKeyword(EVENTS.ACTION)
  .addAnswer("Por favor, describe brevemente tu requerimiento:",
    { capture: true },
    async (ctx, { state, flowDynamic }) => {
      await state.update({ descripcionOtro: sanitizeInput(ctx.body, 1000) });
      await flowDynamic(MENSAJES.PROCESANDO);
    },
  )
  .addAnswer("", {}, async (ctx, { state, flowDynamic, gotoFlow }) => {
    await finalizarConMenu(state, flowDynamic, gotoFlow, "Nueva solicitud SAFI - Otro requerimiento", ctx.from);
  })
  .addAnswer("¿Deseas volver al menú principal?",
    { buttons: [{ body: "⬅️ Volver" }, { body: "✅ Salir" }], capture: true },
    async (ctx, { gotoFlow, flowDynamic, state }) => volverOSalir(ctx, gotoFlow, flowDynamic, state),
  );

/* DESBLOQUEAR USUARIO */
export const desbloquearUsuarioFlow = addKeyword(EVENTS.ACTION)
  .addAnswer("", {}, async (_ctx, { state, flowDynamic, gotoFlow }) => {
    if (!(await verificarTimeout(state, flowDynamic))) return gotoFlow(welcomeFlow);
    if (!(await validarDatosUsuario(state, flowDynamic))) return gotoFlow(welcomeFlow);
    if (!(await validarEmpresaSeleccionada(state, flowDynamic))) return gotoFlow(flujoSeleccionEmpresa);
  })
  .addAnswer("Por favor, digita tu *usuario del sistema*:",
    { capture: true },
    async (ctx, { state }) => { await state.update({ usuarioSistema: sanitizeInput(ctx.body) }); },
  )
  .addAnswer("", {}, async (ctx, { state, flowDynamic, gotoFlow }) => {
    await finalizarConMenu(state, flowDynamic, gotoFlow, "Nueva solicitud SAFI - Incidente: Desbloquear usuario", ctx.from);
  })
  .addAnswer("¿Deseas volver al menú principal?",
    { buttons: [{ body: "⬅️ Volver" }, { body: "✅ Salir" }], capture: true },
    async (ctx, { gotoFlow, flowDynamic, state }) => volverOSalir(ctx, gotoFlow, flowDynamic, state),
  );

/* NO PUEDO OPERAR */
export const noPuedoOperarFlow = addKeyword(EVENTS.ACTION)
  .addAnswer("Por favor, indica una descripción del incidente y tu usuario de sistema:",
    { capture: true },
    async (ctx, { state }) => { await state.update({ descripcionOtro: sanitizeInput(ctx.body, 1000) }); },
  )
  .addAnswer("", {}, async (ctx, { state, flowDynamic, gotoFlow }) => {
    await finalizarConMenu(state, flowDynamic, gotoFlow, "Nueva solicitud SAFI - Incidente: No puedo operar", ctx.from);
  })
  .addAnswer("¿Deseas volver al menú principal?",
    { buttons: [{ body: "⬅️ Volver" }, { body: "✅ Salir" }], capture: true },
    async (ctx, { gotoFlow, flowDynamic, state }) => volverOSalir(ctx, gotoFlow, flowDynamic, state),
  );

/* NOVAHOLD - INCIDENTE */
export const novaholdIncidenteFlow = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAnswer("🛠️ *Incidente - Novahold*")
  .addAnswer("Por favor, digite su *cargo y área* y una *breve descripción* del incidente:",
    { capture: true },
    async (ctx, { state, flowDynamic }) => {
      await state.update({ novIncidenteDetalle: sanitizeInput(ctx.body, 1000) });
      await flowDynamic(MENSAJES.PROCESANDO);
    },
  )
  .addAnswer("", {}, async (ctx, { state, flowDynamic, gotoFlow }) => {
    await finalizarConMenu(state, flowDynamic, gotoFlow, "Nueva solicitud NOVAHOLD - Incidente", ctx.from);
  })
  .addAnswer("¿Deseas volver al menú principal?",
    { buttons: [{ body: "⬅️ Volver" }, { body: "✅ Salir" }], capture: true },
    async (ctx, { gotoFlow, flowDynamic, state }) => volverOSalir(ctx, gotoFlow, flowDynamic, state),
  );

/* NOVAHOLD - REQUERIMIENTOS */
export const requerimientoNovaholdFlow = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAnswer("📂 *REQUERIMIENTO - NOVAHOLD*")
  .addAnswer(
    ["Por favor selecciona:", "", "1️⃣ Cambio de contraseña correo electrónico",
      "2️⃣ Solicitud de equipos", "3️⃣ Otro", "", "Digite el número:"].join("\n"),
    { capture: true },
    async (ctx, { gotoFlow, state, flowDynamic }) => {
      const mapa: any = {
        "1": { tipo: "Cambio de contraseña correo electrónico", flow: novaholdReqCambioPassFlow },
        "2": { tipo: "Solicitud de equipos", flow: novaholdReqEquiposFlow },
        "3": { tipo: "Otro", flow: novaholdReqOtroFlow },
      };
      const op = ctx.body.trim();
      if (mapa[op]) { await state.update({ tipoRequerimientoNovahold: mapa[op].tipo }); return gotoFlow(mapa[op].flow); }
      await flowDynamic("❌ Opción no válida. Digite 1, 2 o 3.");
    },
  );

/* NOVAHOLD - CAMBIO CONTRASEÑA */
export const novaholdReqCambioPassFlow = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAnswer("Por favor, digite su *cargo y área*:",
    { capture: true },
    async (ctx, { state }) => { await state.update({ novCargoArea: sanitizeInput(ctx.body) }); },
  )
  .addAnswer("", {}, async (ctx, { state, flowDynamic, gotoFlow }) => {
    await finalizarConMenu(state, flowDynamic, gotoFlow, "Nueva solicitud NOVAHOLD - Cambio de contraseña correo", ctx.from);
  })
  .addAnswer("¿Deseas volver al menú principal?",
    { buttons: [{ body: "⬅️ Volver" }, { body: "✅ Salir" }], capture: true },
    async (ctx, { gotoFlow, flowDynamic, state }) => volverOSalir(ctx, gotoFlow, flowDynamic, state),
  );

/* NOVAHOLD - SOLICITUD EQUIPOS */
export const novaholdReqEquiposFlow = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAnswer("Por favor, digite su *cargo y área*:",
    { capture: true },
    async (ctx, { state }) => { await state.update({ novCargoArea: sanitizeInput(ctx.body) }); },
  )
  .addAnswer(["Ahora, las *características de su computador*:", "",
    "• Memoria RAM", "• Procesador", "• Almacenamiento", "• Tipo de sistema (32/64 bits)"].join("\n"))
  .addAnswer(["💡 *¿Cómo ver esta información?*", "",
    "1️⃣ Presione *Windows + R*", "2️⃣ Escriba `dxdiag` → *Enter*",
    "3️⃣ Verá Procesador, Memoria y Tipo de sistema",
    "4️⃣ Almacenamiento: *Explorador de archivos* → *Este equipo*"].join("\n"))
  .addAnswer("Cuando tenga los datos, escríbalos aquí en un solo mensaje:",
    { capture: true },
    async (ctx, { state }) => { await state.update({ novPCSpecs: sanitizeInput(ctx.body, 1000) }); },
  )
  .addAnswer("", {}, async (ctx, { state, flowDynamic, gotoFlow }) => {
    await finalizarConMenu(state, flowDynamic, gotoFlow, "Nueva solicitud NOVAHOLD - Solicitud de equipos", ctx.from);
  })
  .addAnswer("¿Deseas volver al menú principal?",
    { buttons: [{ body: "⬅️ Volver" }, { body: "✅ Salir" }], capture: true },
    async (ctx, { gotoFlow, flowDynamic, state }) => volverOSalir(ctx, gotoFlow, flowDynamic, state),
  );

/* NOVAHOLD - OTRO */
export const novaholdReqOtroFlow = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAnswer("Por favor, digite su *cargo y área*:",
    { capture: true },
    async (ctx, { state }) => { await state.update({ novCargoArea: sanitizeInput(ctx.body) }); },
  )
  .addAnswer("Indíquenos una *breve descripción* del requerimiento:",
    { capture: true },
    async (ctx, { state }) => { await state.update({ novDescripcion: sanitizeInput(ctx.body, 1000) }); },
  )
  .addAnswer("", {}, async (ctx, { state, flowDynamic, gotoFlow }) => {
    await finalizarConMenu(state, flowDynamic, gotoFlow, "Nueva solicitud NOVAHOLD - Otro requerimiento", ctx.from);
  })
  .addAnswer("¿Deseas volver al menú principal?",
    { buttons: [{ body: "⬅️ Volver" }, { body: "✅ Salir" }], capture: true },
    async (ctx, { gotoFlow, flowDynamic, state }) => volverOSalir(ctx, gotoFlow, flowDynamic, state),
  );

// ============================================
// ADAPTADOR PRINCIPAL
// ============================================
export const adapterFlow = createFlow([
  welcomeFlow,
  flujoConfirmacionDatos,
  flujoReingresoDatos,
  flujoSeleccionEmpresa,
  motivoContactoFlow,
  asesoriaFlow,
  incidenteFlow,
  requerimientoFlow,
  requerimientoSafiFlow,
  cambioPasswordImeiFlow,
  limpiarIMEIFlow,
  nuevoEmpleadoFlow,
  otroRequerimientoFlow,
  desbloquearUsuarioFlow,
  noPuedoOperarFlow,
  novaholdIncidenteFlow,
  requerimientoNovaholdFlow,
  novaholdReqCambioPassFlow,
  novaholdReqEquiposFlow,
  novaholdReqOtroFlow,
]);