const SPOTIFY_API = 'https://api.spotify.com/v1'

async function spotifyFetch(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (res.status === 401) throw new Error('SPOTIFY_TOKEN_EXPIRED')
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`)
  return res.json()
}

export async function searchAlbums(query, token) {
  const params = new URLSearchParams({ q: query, type: 'album', limit: '10' })
  const data = await spotifyFetch(`${SPOTIFY_API}/search?${params}`, token)
  return data.albums.items
}

export async function getAlbumDetails(albumId, token) {
  return spotifyFetch(`${SPOTIFY_API}/albums/${albumId}`, token)
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
