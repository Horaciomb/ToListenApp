import { useState, useEffect, useCallback } from 'react'
import { searchAlbums } from '../lib/spotify'

export function useSpotifySearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
        const data = await searchAlbums(query)
        if (!cancelled) setResults(data)
      } catch {
        if (!cancelled) setError('Error al buscar. Intenta de nuevo.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    setLoading(false)
  }, [])

  return { query, setQuery, results, loading, error, clear }
}
