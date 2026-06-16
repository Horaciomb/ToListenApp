import { formatDuration, formatDate, getReleaseYear } from '../../lib/utils'
import AlbumNotes from './AlbumNotes'

export default function AlbumCard({ album, userAlbum, variant, onMarkListened, onRevertPending, onDelete, onUpdateNotes, isProcessing }) {
  const handleDelete = () => {
    if (!window.confirm('¿Eliminar este álbum de tu lista?')) return
    onDelete(userAlbum.id)
  }

  const btnBase = 'text-xs font-medium px-3 py-1.5 rounded-full transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden flex sm:flex-col">
      {/* Portada: más grande en mobile (28 = 112px), cuadrada en desktop */}
      <div className="w-28 h-28 sm:w-full sm:aspect-square flex-shrink-0">
        {album.cover_url ? (
          <img
            src={album.cover_url}
            alt={album.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <span className="text-gray-500 text-3xl">🎵</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
        <div className="min-w-0">
          <div className="space-y-0.5 min-w-0">
            <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2">
              {album.name}
            </h3>
            <p className="text-gray-400 text-xs truncate">{album.artist_name}</p>
            <p className="text-gray-500 text-xs">
              {getReleaseYear(album.release_date)}
              {album.total_tracks > 0 && (
                <> · {album.total_tracks} canciones · {formatDuration(album.duration_ms)}</>
              )}
            </p>

            {variant === 'pending' && (
              <p className="text-gray-600 text-xs pt-0.5">
                Añadido el {formatDate(userAlbum.added_at)}
              </p>
            )}
            {variant === 'listened' && formatDate(userAlbum.listened_at) && (
              <p className="text-gray-600 text-xs pt-0.5">
                Escuchado el {formatDate(userAlbum.listened_at)}
              </p>
            )}
          </div>

          {onUpdateNotes && (
            <AlbumNotes
              notes={userAlbum.notes}
              disabled={isProcessing}
              onSave={(text) => onUpdateNotes(userAlbum.id, text)}
            />
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          <a
            href={album.spotify_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnBase} bg-[#1DB954] hover:bg-[#1ed760] text-black`}
          >
            {variant === 'listened' ? 'De nuevo' : '▶ Spotify'}
          </a>

          {variant === 'pending' && (
            <button
              onClick={() => onMarkListened(userAlbum.id)}
              disabled={isProcessing}
              className={`${btnBase} bg-gray-700 hover:bg-gray-600 text-white`}
            >
              {isProcessing ? '...' : '✓ Escuchado'}
            </button>
          )}

          {variant === 'listened' && (
            <button
              onClick={() => onRevertPending(userAlbum.id)}
              disabled={isProcessing}
              className={`${btnBase} bg-gray-700 hover:bg-gray-600 text-white`}
            >
              {isProcessing ? '...' : '↩ Pendiente'}
            </button>
          )}

          <button
            onClick={handleDelete}
            disabled={isProcessing}
            className="text-gray-500 hover:text-red-400 transition-colors ml-auto p-1 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Eliminar"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
