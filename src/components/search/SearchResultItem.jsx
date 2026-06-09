import { useState } from 'react'
import { getReleaseYear } from '../../lib/utils'

export function SearchResultItem({ album, existingStatus, onAdd }) {
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    setIsAdding(true)
    try {
      await onAdd(album)
    } finally {
      setIsAdding(false)
    }
  }

  const coverUrl = album.images?.[1]?.url || album.images?.[0]?.url || null
  const artistName = album.artists?.[0]?.name || 'Artista desconocido'
  const year = getReleaseYear(album.release_date)

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
      {/* Portada */}
      <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} alt={album.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center text-lg">🎵</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{album.name}</p>
        <p className="text-gray-400 text-xs truncate">
          {artistName}{year && ` · ${year}`}
        </p>
      </div>

      {/* Estado / botón */}
      <div className="flex-shrink-0">
        {existingStatus === 'pending' && (
          <span className="text-xs text-gray-400 bg-gray-700 px-2.5 py-1 rounded-full">
            En tu lista
          </span>
        )}
        {existingStatus === 'listened' && (
          <span className="text-xs text-green-400 bg-green-900/40 px-2.5 py-1 rounded-full">
            Ya escuchado
          </span>
        )}
        {!existingStatus && (
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="text-xs bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium px-3 py-1.5 rounded-full transition-colors min-w-[72px] text-center"
          >
            {isAdding ? '...' : '+ Añadir'}
          </button>
        )}
      </div>
    </div>
  )
}
