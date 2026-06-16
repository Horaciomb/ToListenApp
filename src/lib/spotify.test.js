import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock del cliente de Supabase: solo necesitamos functions.invoke.
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('./supabase', () => ({
  supabase: { functions: { invoke } },
}))

import { searchAlbums, getAlbumDetails, buildAlbumCacheEntry } from './spotify'

beforeEach(() => {
  invoke.mockReset()
})

describe('searchAlbums', () => {
  it('invoca spotify-proxy con action "search" y la query, y devuelve data', async () => {
    const items = [{ id: 'a1' }, { id: 'a2' }]
    invoke.mockResolvedValue({ data: items, error: null })

    const result = await searchAlbums('radiohead')

    expect(invoke).toHaveBeenCalledWith('spotify-proxy', {
      body: { action: 'search', query: 'radiohead' },
    })
    expect(result).toBe(items)
  })

  it('lanza SESSION_EXPIRED cuando la Edge Function responde 401', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status', context: { status: 401 } },
    })

    await expect(searchAlbums('x')).rejects.toThrow('SESSION_EXPIRED')
  })

  it('propaga el mensaje original para errores que no son 401', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'boom', context: { status: 500 } },
    })

    await expect(searchAlbums('x')).rejects.toThrow('boom')
  })

  it('propaga el mensaje original cuando el error no trae context', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'network down' } })

    await expect(searchAlbums('x')).rejects.toThrow('network down')
  })
})

describe('getAlbumDetails', () => {
  it('invoca spotify-proxy con action "album" y el albumId, y devuelve data', async () => {
    const album = { id: 'abc', name: 'Album' }
    invoke.mockResolvedValue({ data: album, error: null })

    const result = await getAlbumDetails('abc')

    expect(invoke).toHaveBeenCalledWith('spotify-proxy', {
      body: { action: 'album', albumId: 'abc' },
    })
    expect(result).toBe(album)
  })

  it('lanza SESSION_EXPIRED cuando la Edge Function responde 401', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'unauthorized', context: { status: 401 } },
    })

    await expect(getAlbumDetails('abc')).rejects.toThrow('SESSION_EXPIRED')
  })
})

describe('buildAlbumCacheEntry', () => {
  it('mapea los campos y suma duration_ms de todos los tracks', () => {
    const spotifyAlbum = {
      id: 'abc',
      name: 'To Pimp a Butterfly',
      artists: [{ name: 'Kendrick Lamar' }, { name: 'Feature' }],
      images: [{ url: 'cover640' }, { url: 'cover300' }],
      total_tracks: 16,
      tracks: { items: [{ duration_ms: 1000 }, { duration_ms: 2000 }, { duration_ms: 500 }] },
      release_date: '2015-03-15',
      release_date_precision: 'day',
      uri: 'spotify:album:abc',
      external_urls: { spotify: 'https://open.spotify.com/album/abc' },
      genres: ['hip hop'],
      popularity: 90,
    }

    const entry = buildAlbumCacheEntry(spotifyAlbum)

    expect(entry).toMatchObject({
      spotify_album_id: 'abc',
      name: 'To Pimp a Butterfly',
      artist_name: 'Kendrick Lamar',
      cover_url: 'cover300', // images[1]
      cover_url_large: 'cover640', // images[0]
      total_tracks: 16,
      duration_ms: 3500,
      release_date: '2015-03-15',
      release_date_precision: 'day',
      spotify_uri: 'spotify:album:abc',
      spotify_url: 'https://open.spotify.com/album/abc',
      genres: ['hip hop'],
      popularity: 90,
    })
    expect(entry.artists_json).toBe(spotifyAlbum.artists)
  })

  it('aplica fallbacks cuando faltan imágenes, artistas, tracks y géneros', () => {
    const spotifyAlbum = {
      id: 'xyz',
      name: 'Sin metadata',
      artists: [],
      images: [],
      total_tracks: 0,
      uri: 'spotify:album:xyz',
      external_urls: { spotify: 'https://open.spotify.com/album/xyz' },
    }

    const entry = buildAlbumCacheEntry(spotifyAlbum)

    expect(entry.artist_name).toBe('Artista desconocido')
    expect(entry.cover_url).toBeNull()
    expect(entry.cover_url_large).toBeNull()
    expect(entry.duration_ms).toBe(0)
    expect(entry.genres).toEqual([])
  })

  it('usa la imagen grande como cover_url si solo hay una imagen', () => {
    const entry = buildAlbumCacheEntry({
      id: 'one',
      name: 'Una imagen',
      artists: [{ name: 'Solo' }],
      images: [{ url: 'onlyImage' }],
      total_tracks: 1,
      tracks: { items: [] },
      uri: 'spotify:album:one',
      external_urls: { spotify: 'https://open.spotify.com/album/one' },
    })

    expect(entry.cover_url).toBe('onlyImage')
    expect(entry.cover_url_large).toBe('onlyImage')
  })
})
