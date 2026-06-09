import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUiStore, TOAST } from '../../store/uiStore'
import { useSpotifySearch } from '../../hooks/useSpotifySearch'
import { useMyAlbumIds, useAddAlbum } from '../../hooks/useAlbums'
import { handleTokenExpired } from '../../lib/handleTokenExpired'
import { SearchResultItem } from './SearchResultItem'

export default function SearchModal() {
  const isOpen = useUiStore(s => s.isSearchModalOpen)
  const setSearchModalOpen = useUiStore(s => s.setSearchModalOpen)
  const showToast = useUiStore(s => s.showToast)
  const navigate = useNavigate()

  const onTokenExpired = () => handleTokenExpired(navigate, showToast)

  const search = useSpotifySearch({ onTokenExpired })
  const { data: myAlbumIds = new Map() } = useMyAlbumIds()
  const addAlbum = useAddAlbum()
  const inputRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [isOpen])

  const handleClose = () => {
    search.clear()
    setSearchModalOpen(false)
  }

  const handleAdd = async (album) => {
    try {
      await addAlbum.mutateAsync(album)
      showToast(TOAST.albumAdded)
    } catch (err) {
      if (err.message === 'SPOTIFY_TOKEN_EXPIRED') {
        handleClose()
        handleTokenExpired(navigate, showToast)
        return
      }
      showToast(TOAST.genericError, 'error')
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="w-full max-w-lg bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          {search.loading ? (
            <svg className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar álbumes en Spotify..."
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
          />
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-white text-lg leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Resultados */}
        <div className="max-h-96 overflow-y-auto">
          {search.error && (
            <p className="text-red-400 text-sm text-center py-8">{search.error}</p>
          )}

          {!search.loading && !search.error && search.query && search.results.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">
              Sin resultados para "{search.query}"
            </p>
          )}

          {!search.query && (
            <p className="text-gray-600 text-sm text-center py-8">
              Escribe para buscar álbumes
            </p>
          )}

          {search.results.length > 0 && (
            <div className="p-2">
              {search.results.map(album => (
                <SearchResultItem
                  key={album.id}
                  album={album}
                  existingStatus={myAlbumIds.get(album.id)}
                  onAdd={handleAdd}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
