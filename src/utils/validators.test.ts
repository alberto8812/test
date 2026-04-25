import { describe, it, expect } from 'vitest'
import { validarEmail, validarNombre, extraerDatosUsuario } from './validators'

describe('validarEmail', () => {
  it('acepta email válido', () => {
    expect(validarEmail('juan.perez@empresa.com')).toBe(true)
  })

  it('acepta email con subdominio', () => {
    expect(validarEmail('usuario@mail.empresa.co')).toBe(true)
  })

  it('rechaza email sin @', () => {
    expect(validarEmail('juanempresa.com')).toBe(false)
  })

  it('rechaza email que empieza con punto', () => {
    expect(validarEmail('.juan@empresa.com')).toBe(false)
  })

  it('rechaza email que termina con punto', () => {
    expect(validarEmail('juan@empresa.com.')).toBe(false)
  })

  it('rechaza email con doble punto', () => {
    expect(validarEmail('juan..perez@empresa.com')).toBe(false)
  })

  it('rechaza email mayor a 254 caracteres', () => {
    const largo = 'a'.repeat(249) + '@b.com' // 255 chars > 254
    expect(validarEmail(largo)).toBe(false)
  })

  it('ignora espacios al inicio/fin (trim)', () => {
    expect(validarEmail('  juan@empresa.com  ')).toBe(true)
  })
})

describe('validarNombre', () => {
  it('acepta nombre válido', () => {
    expect(validarNombre('Juan Pérez')).toBe(true)
  })

  it('rechaza nombre menor a 3 caracteres', () => {
    expect(validarNombre('Jo')).toBe(false)
  })

  it('rechaza nombre compuesto solo de dígitos', () => {
    expect(validarNombre('12345')).toBe(false)
  })

  it('rechaza nombre sin letras del alfabeto', () => {
    expect(validarNombre('!@#$%')).toBe(false)
  })

  it('acepta nombre con acentos', () => {
    expect(validarNombre('María Ángel')).toBe(true)
  })

  it('acepta nombre con ñ', () => {
    expect(validarNombre('Toño Muñoz')).toBe(true)
  })
})

describe('extraerDatosUsuario', () => {
  it('extrae nombre y email correctamente', () => {
    const result = extraerDatosUsuario('Juan Pérez juan.perez@empresa.com')
    expect(result.nombre).toBe('Juan Pérez')
    expect(result.email).toBe('juan.perez@empresa.com')
    expect(result.valido).toBe(true)
  })

  it('marca como inválido si el email no es válido', () => {
    const result = extraerDatosUsuario('Juan Pérez no-es-email')
    expect(result.valido).toBe(false)
  })

  it('marca como inválido si el nombre es muy corto', () => {
    const result = extraerDatosUsuario('Jo jo@empresa.com')
    expect(result.valido).toBe(false)
  })

  it('extrae email aunque esté al inicio del texto', () => {
    const result = extraerDatosUsuario('juan@empresa.com Juan Pérez')
    expect(result.email).toBe('juan@empresa.com')
    expect(result.valido).toBe(true)
  })
})
