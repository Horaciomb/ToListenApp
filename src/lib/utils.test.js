import { describe, it, expect } from 'vitest'
import { formatDuration, formatDate, getReleaseYear, filterAndSortAlbums } from './utils'

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

describe('filterAndSortAlbums', () => {
  const items = [
    { id: '1', added_at: '2024-01-01', listened_at: '2024-03-01', albums_cache: { name: 'Kid A', artist_name: 'Radiohead', release_date: '2000-10-02', duration_ms: 3000 } },
    { id: '2', added_at: '2024-02-01', listened_at: '2024-01-01', albums_cache: { name: 'Blonde', artist_name: 'Frank Ocean', release_date: '2016-08-20', duration_ms: 1000 } },
    { id: '3', added_at: '2024-03-01', listened_at: '2024-02-01', albums_cache: { name: 'Currents', artist_name: 'Tame Impala', release_date: '2015-07-17', duration_ms: 2000 } },
  ]

  it('devuelve [] para entradas no-array', () => {
    expect(filterAndSortAlbums(null, {})).toEqual([])
    expect(filterAndSortAlbums(undefined, {})).toEqual([])
  })

  it('no muta el array original', () => {
    const copy = [...items]
    filterAndSortAlbums(items, { sort: 'artist' })
    expect(items).toEqual(copy)
  })

  it('filtra por nombre de álbum (case-insensitive)', () => {
    const result = filterAndSortAlbums(items, { query: 'blon' })
    expect(result.map(i => i.id)).toEqual(['2'])
  })

  it('filtra por artista (case-insensitive)', () => {
    const result = filterAndSortAlbums(items, { query: 'RADIOHEAD' })
    expect(result.map(i => i.id)).toEqual(['1'])
  })

  it('ordena por artista A-Z', () => {
    const result = filterAndSortAlbums(items, { sort: 'artist' })
    expect(result.map(i => i.albums_cache.artist_name)).toEqual(['Frank Ocean', 'Radiohead', 'Tame Impala'])
  })

  it('ordena por año (nuevo a viejo)', () => {
    const result = filterAndSortAlbums(items, { sort: 'year' })
    expect(result.map(i => i.id)).toEqual(['2', '3', '1'])
  })

  it('ordena por duración (larga a corta)', () => {
    const result = filterAndSortAlbums(items, { sort: 'duration' })
    expect(result.map(i => i.id)).toEqual(['1', '3', '2'])
  })

  it('ordena por añadido reciente', () => {
    const result = filterAndSortAlbums(items, { sort: 'recent_added' })
    expect(result.map(i => i.id)).toEqual(['3', '2', '1'])
  })

  it('ordena por escuchado reciente', () => {
    const result = filterAndSortAlbums(items, { sort: 'recent_listened' })
    expect(result.map(i => i.id)).toEqual(['1', '3', '2'])
  })

  it('combina filtro y orden', () => {
    const result = filterAndSortAlbums(items, { query: 'a', sort: 'artist' })
    // "a" matchea Kid A, Radiohead, Tame Impala, Frank Ocean (todos) -> ordena por artista
    expect(result.map(i => i.albums_cache.artist_name)).toEqual(['Frank Ocean', 'Radiohead', 'Tame Impala'])
  })
})
