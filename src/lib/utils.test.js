import { describe, it, expect } from 'vitest'
import { formatDuration, formatDate, getReleaseYear } from './utils'

describe('formatDuration', () => {
  it('devuelve "--" para 0, null o undefined', () => {
    expect(formatDuration(0)).toBe('--')
    expect(formatDuration(null)).toBe('--')
    expect(formatDuration(undefined)).toBe('--')
  })

  it('formatea duraciones menores a una hora en minutos', () => {
    expect(formatDuration(25 * 60000)).toBe('25 min')
  })

  it('formatea duraciones de una hora o más como "Xh Ym"', () => {
    // 1h 5m
    expect(formatDuration((60 + 5) * 60000)).toBe('1h 5m')
    // 2h 0m
    expect(formatDuration(120 * 60000)).toBe('2h 0m')
  })

  it('trunca los segundos sobrantes hacia abajo', () => {
    expect(formatDuration(59 * 1000)).toBe('0 min')
  })
})

describe('formatDate', () => {
  it('devuelve null cuando el valor es null o vacío', () => {
    expect(formatDate(null)).toBeNull()
    expect(formatDate('')).toBeNull()
  })

  it('devuelve un string con el año para una fecha ISO válida', () => {
    const result = formatDate('2024-01-15T10:00:00Z')
    expect(typeof result).toBe('string')
    expect(result).toContain('2024')
  })
})

describe('getReleaseYear', () => {
  it('devuelve string vacío cuando no hay fecha', () => {
    expect(getReleaseYear(null)).toBe('')
    expect(getReleaseYear('')).toBe('')
  })

  it('extrae el año de una fecha "YYYY-MM-DD"', () => {
    expect(getReleaseYear('2015-09-18')).toBe('2015')
  })

  it('devuelve el valor tal cual cuando la precisión es solo el año', () => {
    expect(getReleaseYear('2015')).toBe('2015')
  })
})
