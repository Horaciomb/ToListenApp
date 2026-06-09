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
