import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { searchAlbums } from '../lib/spotify'

export function useSpotifySearch({ onTokenExpired } = {}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const spotifyToken = useAuthStore(s => s.spotifyToken)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await searchAlbums(query, spotifyToken)
        if (!cancelled) setResults(data)
      } catch (err) {
        if (!cancelled) {
          if (err.message === 'SPOTIFY_TOKEN_EXPIRED') {
            onTokenExpired?.()
            return
          }
          setError('Error al buscar. Intenta de nuevo.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, spotifyToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    setLoading(false)
  }, [])

  return { query, setQuery, results, loading, error, clear }
}
