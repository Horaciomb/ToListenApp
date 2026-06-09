import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/ui/Header'
import AlbumCard from '../components/album/AlbumCard'
import AlbumCardSkeleton from '../components/album/AlbumCardSkeleton'
import EmptyState from '../components/ui/EmptyState'
import { usePendingAlbums, useMarkListened, useDeleteAlbum } from '../hooks/useAlbums'
import { useUiStore, TOAST } from '../store/uiStore'
import { handleTokenExpired } from '../lib/handleTokenExpired'

export default function ListPage() {
  const { data, isLoading, isError } = usePendingAlbums()
  const markListened = useMarkListened()
  const deleteAlbum = useDeleteAlbum()
  const showToast = useUiStore(s => s.showToast)
  const navigate = useNavigate()
  const [processingId, setProcessingId] = useState(null)

  const handleMutation = async (id, fn, successMsg, successType = 'success') => {
    setProcessingId(id)
    try {
      await fn(id)
      showToast(successMsg, successType)
    } catch (err) {
      if (err.message === 'SPOTIFY_TOKEN_EXPIRED') {
        handleTokenExpired(navigate, showToast)
        return
      }
      showToast(TOAST.genericError, 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleMarkListened = (id) =>
    handleMutation(id, markListened.mutateAsync, TOAST.markedListened)

  const handleDelete = (id) =>
    handleMutation(id, deleteAlbum.mutateAsync, TOAST.albumDeleted, 'info')

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 pb-28 sm:pb-8">
        <h2 className="text-white text-xl font-semibold mb-6">
          Pendientes de escuchar
          {data?.length > 0 && (
            <span className="ml-2 text-sm text-gray-500 font-normal">{data.length}</span>
          )}
        </h2>

        {isError && (
          <p className="text-red-400 text-sm">Error al cargar la lista. Recarga la página.</p>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <AlbumCardSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && !isError && data?.length === 0 && (
          <EmptyState message="Tu lista está vacía. Busca un álbum para empezar." />
        )}

        {!isLoading && !isError && data?.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map(item => {
              const { albums_cache: album, ...userAlbum } = item
              return (
                <AlbumCard
                  key={userAlbum.id}
                  album={album}
                  userAlbum={userAlbum}
                  variant="pending"
                  onMarkListened={handleMarkListened}
                  onDelete={handleDelete}
                  isProcessing={processingId === userAlbum.id}
                />
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
