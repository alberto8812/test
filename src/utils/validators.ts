export interface DatosUsuario {
  nombre: string
  email: string
  valido: boolean
}

export function validarEmail(email: string): boolean {
  const emailLimpio = email.trim().toLowerCase()
  if (emailLimpio.length > 254) return false
  if (emailLimpio.startsWith('.') || emailLimpio.endsWith('.')) return false
  if (emailLimpio.includes('..')) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)
}

export function validarNombre(nombre: string): boolean {
  const n = nombre.trim()
  if (n.length < 3) return false
  if (/^\d+$/.test(n)) return false
  return /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(n)
}

export function extraerDatosUsuario(texto: string): DatosUsuario {
  const emailMatch = texto.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)
  const email = emailMatch ? emailMatch[0].trim() : ''
  const nombre = texto.replace(email, '').trim().replace(/\s+/g, ' ')
  const valido = validarEmail(email) && validarNombre(nombre)
  return { nombre, email, valido }
}
