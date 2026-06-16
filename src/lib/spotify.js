import { supabase } from './supabase'

// Si la Edge Function responde 401, la sesión de Supabase expiró.
// Normalizamos ese caso a un único error 'SESSION_EXPIRED' que la UI detecta.
function toError(error) {
  if (error.context?.status === 401) return new Error('SESSION_EXPIRED')
  return new Error(error.message)
}

// Búsqueda rápida — NO incluye duration_ms ni lista de tracks.
// Va por la Edge Function spotify-proxy; el JWT del usuario se incluye solo.
export async function searchAlbums(query) {
  const { data, error } = await supabase.functions.invoke('spotify-proxy', {
    body: { action: 'search', query }
  })
  if (error) throw toError(error)
  return data
}

// Detalle completo — incluye tracks para calcular duration_ms.
// SIEMPRE llamar esto antes de insertar en albums_cache.
export async function getAlbumDetails(albumId) {
  const { data, error } = await supabase.functions.invoke('spotify-proxy', {
    body: { action: 'album', albumId }
  })
  if (error) throw toError(error)
  return data
}

export function buildAlbumCacheEntry(spotifyAlbum) {
  const durationMs = (spotifyAlbum.tracks?.items || []).reduce(
    (sum, track) => sum + (track.duration_ms || 0), 0
  )
  return {
    spotify_album_id:       spotifyAlbum.id,
    name:                   spotifyAlbum.name,
    artist_name:            spotifyAlbum.artists[0]?.name || 'Artista desconocido',
    artists_json:           spotifyAlbum.artists,
    cover_url:              spotifyAlbum.images[1]?.url || spotifyAlbum.images[0]?.url || null,
    cover_url_large:        spotifyAlbum.images[0]?.url || null,
    total_tracks:           spotifyAlbum.total_tracks,
    duration_ms:            durationMs,
    release_date:           spotifyAlbum.release_date,
    release_date_precision: spotifyAlbum.release_date_precision,
    spotify_uri:            spotifyAlbum.uri,
    spotify_url:            spotifyAlbum.external_urls.spotify,
    genres:                 spotifyAlbum.genres || [],
    popularity:             spotifyAlbum.popularity
  }
}
