import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchAlbums } from '../lib/spotify'
import { useUiStore } from '../store/uiStore'
import { handleTokenExpired } from '../lib/handleTokenExpired'

export function useSpotifySearch() {
  const [query, setQueryState] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const showToast = useUiStore(s => s.showToast)

  // Resetea el estado en el mismo evento que vacía el input (no en el effect),
  // así la limpieza es inmediata y no quedan resultados viejos en pantalla.
  const setQuery = useCallback((value) => {
    setQueryState(value)
    if (!value.trim()) {
      setResults([])
      setError(null)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!query.trim()) return

    let cancelled = false

    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await searchAlbums(query)
        if (!cancelled) setResults(data)
      } catch (err) {
        if (!cancelled) {
          if (err.message === 'SESSION_EXPIRED') {
            handleTokenExpired(navigate, showToast)
          } else {
            setError('Error al buscar. Intenta de nuevo.')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, navigate, showToast])

  const clear = useCallback(() => {
    setQuery('')
  }, [setQuery])

  return { query, setQuery, results, loading, error, clear }
}
