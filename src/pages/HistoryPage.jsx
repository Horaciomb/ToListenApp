import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/ui/Header'
import AlbumCard from '../components/album/AlbumCard'
import AlbumCardSkeleton from '../components/album/AlbumCardSkeleton'
import ListControls from '../components/album/ListControls'
import EmptyState from '../components/ui/EmptyState'
import { useListenedAlbums, useRevertPending, useDeleteAlbum, useUpdateNotes } from '../hooks/useAlbums'
import { useUiStore, TOAST } from '../store/uiStore'
import { handleTokenExpired } from '../lib/handleTokenExpired'
import { filterAndSortAlbums } from '../lib/utils'

const SORT_OPTIONS = [
  { value: 'recent_listened', label: 'Más recientes' },
  { value: 'artist', label: 'Artista (A-Z)' },
  { value: 'year', label: 'Año (nuevo-viejo)' },
  { value: 'duration', label: 'Duración (larga-corta)' },
  { value: 'name', label: 'Título (A-Z)' },
]

export default function HistoryPage() {
  const { data, isLoading, isError } = useListenedAlbums()
  const revertPending = useRevertPending()
  const deleteAlbum = useDeleteAlbum()
  const updateNotes = useUpdateNotes()
  const showToast = useUiStore(s => s.showToast)
  const navigate = useNavigate()
  const [processingId, setProcessingId] = useState(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent_listened')

  const visible = useMemo(
    () => filterAndSortAlbums(data || [], { query, sort }),
    [data, query, sort]
  )

  const listenedThisMonth = useMemo(() => {
    const now = new Date()
    return (data || []).filter(item => {
      if (!item.listened_at) return false
      const d = new Date(item.listened_at)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).length
  }, [data])

  const handleMutation = async (id, fn, successMsg, successType = 'success') => {
    setProcessingId(id)
    try {
      await fn(id)
      showToast(successMsg, successType)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        handleTokenExpired(navigate, showToast)
        return
      }
      showToast(TOAST.genericError, 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRevertPending = (id) =>
    handleMutation(id, revertPending.mutateAsync, TOAST.revertedPending)

  const handleDelete = (id) =>
    handleMutation(id, deleteAlbum.mutateAsync, TOAST.albumDeleted, 'info')

  const handleUpdateNotes = async (userAlbumId, notes) => {
    try {
      await updateNotes.mutateAsync({ userAlbumId, notes })
      showToast(TOAST.notesSaved)
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        handleTokenExpired(navigate, showToast)
        return
      }
      showToast(TOAST.genericError, 'error')
    }
  }

  const hasAlbums = !isLoading && !isError && data?.length > 0

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 pb-28 sm:pb-8">
        <div className="mb-6">
          <h2 className="text-white text-xl font-semibold">Historial de escuchados</h2>
          {hasAlbums && (
            <p className="text-gray-500 text-sm mt-1">
              {data.length} {data.length === 1 ? 'escuchado' : 'escuchados'}
              {listenedThisMonth > 0 && <> · {listenedThisMonth} este mes</>}
            </p>
          )}
        </div>

        {isError && (
          <p className="text-red-400 text-sm">Error al cargar el historial. Recarga la página.</p>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <AlbumCardSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && !isError && data?.length === 0 && (
          <EmptyState message="Aún no has marcado ningún álbum como escuchado." />
        )}

        {hasAlbums && (
          <>
            <ListControls
              query={query}
              onQueryChange={setQuery}
              sort={sort}
              onSortChange={setSort}
              sortOptions={SORT_OPTIONS}
            />

            {visible.length === 0 ? (
              <EmptyState message={`Sin resultados para "${query}".`} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visible.map(item => {
                  const { albums_cache: album, ...userAlbum } = item
                  return (
                    <AlbumCard
                      key={userAlbum.id}
                      album={album}
                      userAlbum={userAlbum}
                      variant="listened"
                      onRevertPending={handleRevertPending}
                      onDelete={handleDelete}
                      onUpdateNotes={handleUpdateNotes}
                      isProcessing={processingId === userAlbum.id}
                    />
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
