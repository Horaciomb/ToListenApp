// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement } from 'react'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ─── Mock del cliente Supabase: builder encadenable y "thenable" ────────────────
// Cada método registra su llamada y devuelve el mismo builder; al hacer `await`
// se consume el siguiente resultado de la cola (resultQueue), en orden FIFO.
const { supabaseMock, setResults, getCalls, resetMock } = vi.hoisted(() => {
  let resultQueue = []
  let calls = []
  const builder = {}
  const record = (name) =>
    vi.fn((...args) => {
      calls.push({ name, args })
      return builder
    })
  builder.from = record('from')
  builder.upsert = record('upsert')
  builder.insert = record('insert')
  builder.update = record('update')
  builder.delete = record('delete')
  builder.eq = record('eq')
  builder.then = (resolve) =>
    resolve(resultQueue.length ? resultQueue.shift() : { data: null, error: null })
  return {
    supabaseMock: builder,
    setResults: (arr) => { resultQueue = arr },
    getCalls: () => calls,
    resetMock: () => { resultQueue = []; calls = [] },
  }
})
vi.mock('../lib/supabase', () => ({ supabase: supabaseMock }))

// getAlbumDetails mockeado; buildAlbumCacheEntry se mantiene real (es puro).
const { getAlbumDetails } = vi.hoisted(() => ({ getAlbumDetails: vi.fn() }))
vi.mock('../lib/spotify', async (importActual) => ({
  ...(await importActual()),
  getAlbumDetails,
}))

import { useAuthStore } from '../store/authStore'
import {
  useAddAlbum,
  useMarkListened,
  useRevertPending,
  useDeleteAlbum,
} from './useAlbums'

const USER_ID = 'user-1'

function wrapper({ children }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return createElement(QueryClientProvider, { client: qc }, children)
}

function findCall(name, predicate = () => true) {
  return getCalls().find((c) => c.name === name && predicate(c))
}

beforeEach(() => {
  resetMock()
  getAlbumDetails.mockReset()
  useAuthStore.setState({ user: { id: USER_ID }, session: {} })
})

// Detalle de álbum tal como lo devuelve getAlbumDetails (entrada de buildAlbumCacheEntry).
const albumDetails = {
  id: 'alb-1',
  name: 'Album',
  artists: [{ name: 'Artist' }],
  images: [{ url: 'big' }, { url: 'mid' }],
  total_tracks: 2,
  tracks: { items: [{ duration_ms: 1000 }, { duration_ms: 2000 }] },
  release_date: '2020-01-01',
  release_date_precision: 'day',
  uri: 'spotify:album:alb-1',
  external_urls: { spotify: 'https://open.spotify.com/album/alb-1' },
  genres: [],
  popularity: 50,
}

describe('useAddAlbum', () => {
  it('cachea el álbum e inserta el user_album con el user id del store', async () => {
    getAlbumDetails.mockResolvedValue(albumDetails)
    setResults([{ error: null }, { error: null }]) // upsert cache, insert user_album

    const { result } = renderHook(() => useAddAlbum(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ id: 'alb-1' })
    })

    expect(getAlbumDetails).toHaveBeenCalledWith('alb-1')

    // upsert en albums_cache con la entrada construida (duration_ms sumada)
    expect(findCall('from', (c) => c.args[0] === 'albums_cache')).toBeTruthy()
    const upsert = findCall('upsert')
    expect(upsert.args[0]).toMatchObject({ spotify_album_id: 'alb-1', duration_ms: 3000 })
    expect(upsert.args[1]).toEqual({ onConflict: 'spotify_album_id' })

    // insert en user_albums con user_id del store y status pending
    const insert = findCall('insert')
    expect(insert.args[0]).toEqual({
      user_id: USER_ID,
      spotify_album_id: 'alb-1',
      status: 'pending',
    })
  })

  it('ignora silenciosamente el duplicado (error 23505) sin lanzar', async () => {
    getAlbumDetails.mockResolvedValue(albumDetails)
    setResults([{ error: null }, { error: { code: '23505' } }])

    const { result } = renderHook(() => useAddAlbum(), { wrapper })
    await act(async () => {
      await expect(result.current.mutateAsync({ id: 'alb-1' })).resolves.toBeUndefined()
    })
  })

  it('lanza si el insert falla con un error distinto a 23505', async () => {
    getAlbumDetails.mockResolvedValue(albumDetails)
    setResults([{ error: null }, { error: { code: '500', message: 'boom' } }])

    const { result } = renderHook(() => useAddAlbum(), { wrapper })
    await act(async () => {
      await expect(result.current.mutateAsync({ id: 'alb-1' })).rejects.toBeTruthy()
    })
  })

  it('lanza si falla el upsert al cache (no intenta insertar)', async () => {
    getAlbumDetails.mockResolvedValue(albumDetails)
    setResults([{ error: { message: 'cache fail' } }])

    const { result } = renderHook(() => useAddAlbum(), { wrapper })
    await act(async () => {
      await expect(result.current.mutateAsync({ id: 'alb-1' })).rejects.toBeTruthy()
    })
    expect(findCall('insert')).toBeFalsy()
  })
})

describe('useMarkListened', () => {
  it('marca status=listened y setea listened_at por id', async () => {
    setResults([{ error: null }])

    const { result } = renderHook(() => useMarkListened(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync('ua-1')
    })

    const update = findCall('update')
    expect(update.args[0].status).toBe('listened')
    expect(typeof update.args[0].listened_at).toBe('string')
    expect(findCall('eq').args).toEqual(['id', 'ua-1'])
  })
})

describe('useRevertPending', () => {
  it('vuelve a status=pending y limpia listened_at (null)', async () => {
    setResults([{ error: null }])

    const { result } = renderHook(() => useRevertPending(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync('ua-1')
    })

    const update = findCall('update')
    expect(update.args[0]).toEqual({ status: 'pending', listened_at: null })
    expect(findCall('eq').args).toEqual(['id', 'ua-1'])
  })
})

describe('useDeleteAlbum', () => {
  it('borra el user_album por id', async () => {
    setResults([{ error: null }])

    const { result } = renderHook(() => useDeleteAlbum(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync('ua-1')
    })

    expect(findCall('delete')).toBeTruthy()
    expect(findCall('from').args[0]).toBe('user_albums')
    expect(findCall('eq').args).toEqual(['id', 'ua-1'])
  })
})
