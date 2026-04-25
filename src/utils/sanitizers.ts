export function sanitizeForEmail(text: string): string {
  if (!text) return ''
  return text
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;').replace(/`/g, '&#x60;').trim()
}

export function sanitizeInput(text: string, maxLength = 1000): string {
  if (!text) return ''
  return text.substring(0, maxLength).trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

export function dividirMensaje(texto: string, max = 1500): string[] {
  if (texto.length <= max) return [texto]
  const msgs: string[] = []
  let i = 0
  while (i < texto.length) {
    let fin = i + max
    if (fin < texto.length) {
      const s = texto.lastIndexOf('\n', fin)
      if (s > i) fin = s
    }
    msgs.push(texto.substring(i, fin).trim())
    i = fin + 1
  }
  return msgs
}
