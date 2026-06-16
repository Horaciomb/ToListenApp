export function formatDuration(ms) {
  if (!ms || ms === 0) return '--'
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes} min`
}

export function formatDate(isoString) {
  if (!isoString) return null
  return new Date(isoString).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export function getReleaseYear(releaseDate) {
  if (!releaseDate) return ''
  return releaseDate.split('-')[0]
}

function releaseYearNum(releaseDate) {
  if (!releaseDate) return 0
  return parseInt(releaseDate.split('-')[0], 10) || 0
}

function timestamp(iso) {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t
}

// Filtra (por nombre de álbum o artista) y ordena la lista de user_albums.
// `items` tiene el shape { ...userAlbum, albums_cache: {...} }. No muta el input.
export function filterAndSortAlbums(items, { query = '', sort = '' } = {}) {
  if (!Array.isArray(items)) return []

  const q = query.trim().toLowerCase()
  const albumOf = (item) => item.albums_cache || {}

  const filtered = q
    ? items.filter((item) => {
        const album = albumOf(item)
        const name = (album.name || '').toLowerCase()
        const artist = (album.artist_name || '').toLowerCase()
        return name.includes(q) || artist.includes(q)
      })
    : items

  const sorted = [...filtered]
  const byText = (a, b) =>
    a.localeCompare(b, 'es', { sensitivity: 'base' })

  switch (sort) {
    case 'artist':
      sorted.sort((a, b) => byText(albumOf(a).artist_name ?? '', albumOf(b).artist_name ?? ''))
      break
    case 'name':
      sorted.sort((a, b) => byText(albumOf(a).name ?? '', albumOf(b).name ?? ''))
      break
    case 'year':
      sorted.sort((a, b) => releaseYearNum(albumOf(b).release_date) - releaseYearNum(albumOf(a).release_date))
      break
    case 'duration':
      sorted.sort((a, b) => (albumOf(b).duration_ms || 0) - (albumOf(a).duration_ms || 0))
      break
    case 'recent_added':
      sorted.sort((a, b) => timestamp(b.added_at) - timestamp(a.added_at))
      break
    case 'recent_listened':
      sorted.sort((a, b) => timestamp(b.listened_at) - timestamp(a.listened_at))
      break
    default:
      break
  }

  return sorted
}
