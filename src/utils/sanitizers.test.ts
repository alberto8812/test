import { describe, it, expect } from 'vitest'
import { sanitizeForEmail, sanitizeInput, dividirMensaje } from './sanitizers'

describe('sanitizeForEmail', () => {
  it('escapa < y >', () => {
    expect(sanitizeForEmail('<script>')).toBe('&lt;script&gt;')
  })

  it('escapa comillas dobles', () => {
    expect(sanitizeForEmail('"hola"')).toBe('&quot;hola&quot;')
  })

  it('escapa comillas simples', () => {
    expect(sanitizeForEmail("it's")).toBe('it&#x27;s')
  })

  it('escapa backtick', () => {
    expect(sanitizeForEmail('`cmd`')).toBe('&#x60;cmd&#x60;')
  })

  it('retorna string vacío si el input es vacío', () => {
    expect(sanitizeForEmail('')).toBe('')
  })

  it('no altera texto sin caracteres especiales', () => {
    expect(sanitizeForEmail('Juan Pérez')).toBe('Juan Pérez')
  })
})

describe('sanitizeInput', () => {
  it('trunca al límite máximo por defecto (1000)', () => {
    const largo = 'a'.repeat(1100)
    expect(sanitizeInput(largo)).toHaveLength(1000)
  })

  it('trunca al límite personalizado', () => {
    expect(sanitizeInput('abcdef', 3)).toBe('abc')
  })

  it('hace trim del resultado', () => {
    expect(sanitizeInput('  hola  ')).toBe('hola')
  })

  it('remueve caracteres de control', () => {
    expect(sanitizeInput('hola\x01mundo')).toBe('holamundo')
  })

  it('retorna string vacío si el input es vacío', () => {
    expect(sanitizeInput('')).toBe('')
  })
})

describe('dividirMensaje', () => {
  it('retorna el mensaje en un array si cabe en el límite', () => {
    const result = dividirMensaje('Hola mundo')
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('Hola mundo')
  })

  it('divide un mensaje largo en múltiples partes', () => {
    const lineas = Array.from({ length: 10 }, (_, i) => `Línea ${i + 1}`).join('\n')
    const result = dividirMensaje(lineas, 30)
    expect(result.length).toBeGreaterThan(1)
    result.forEach(parte => expect(parte.length).toBeLessThanOrEqual(30))
  })

  it('cada parte no excede el máximo', () => {
    const texto = 'a'.repeat(4000)
    const result = dividirMensaje(texto, 1500)
    result.forEach(parte => expect(parte.length).toBeLessThanOrEqual(1500))
  })
})
