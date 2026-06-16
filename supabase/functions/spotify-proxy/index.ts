// supabase/functions/spotify-proxy/index.ts
//
// Proxy server-to-server para el API de Spotify usando Client Credentials.
// Verifica el JWT de Supabase del usuario antes de llamar a Spotify.
//
// Acciones soportadas (body JSON):
//   { action: 'search', query: '...' }   → busca álbumes
//   { action: 'album', albumId: '...' }  → detalle completo de un álbum
//
// Secrets requeridos (Supabase Edge Function Secrets):
//   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
// Disponibles automáticamente: SUPABASE_URL, SUPABASE_ANON_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SPOTIFY_API = 'https://api.spotify.com/v1'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'

// ─── Cache en memoria del token de Spotify (Client Credentials) ────────────────
// Persiste entre requests mientras la instancia de la función siga viva.
let cachedToken: string | null = null
let tokenExpiresAt = 0 // epoch ms

async function getSpotifyToken(): Promise<string> {
  const now = Date.now()
  // Reutilizar si aún es válido (con 60s de margen de seguridad).
  if (cachedToken && now < tokenExpiresAt - 60_000) {
    return cachedToken
  }

  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID')
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    throw new Error('Faltan SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET')
  }

  const basic = btoa(`${clientId}:${clientSecret}`)
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    throw new Error(`Error al obtener token de Spotify: ${res.status}`)
  }

  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiresAt = now + data.expires_in * 1000
  return cachedToken as string
}

async function spotifyFetch(url: string): Promise<unknown> {
  const token = await getSpotifyToken()
  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  // Si el token cacheado quedó inválido, forzar refresco una vez.
  if (res.status === 401) {
    cachedToken = null
    tokenExpiresAt = 0
    const fresh = await getSpotifyToken()
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${fresh}` },
    })
  }

  if (!res.ok) {
    throw new Error(`Spotify API error: ${res.status}`)
  }
  return res.json()
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido' }, 405)
  }

  try {
    // ─── Verificar JWT de Supabase ──────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'No autorizado' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return json({ error: 'No autorizado' }, 401)
    }

    // ─── Procesar la acción ─────────────────────────────────────────────────
    const { action, query, albumId } = await req.json()

    if (action === 'search') {
      if (!query || !query.trim()) {
        return json({ error: 'Falta el parámetro query' }, 400)
      }
      const params = new URLSearchParams({
        q: query,
        type: 'album',
        limit: '10',
      })
      const data = await spotifyFetch(`${SPOTIFY_API}/search?${params}`)
      return json((data as { albums: { items: unknown[] } }).albums.items)
    }

    if (action === 'album') {
      if (!albumId) {
        return json({ error: 'Falta el parámetro albumId' }, 400)
      }
      const data = await spotifyFetch(`${SPOTIFY_API}/albums/${albumId}`)
      return json(data)
    }

    return json({ error: 'Acción desconocida' }, 400)
  } catch (err) {
    console.error('spotify-proxy error:', err)
    return json({ error: (err as Error).message ?? 'Error interno' }, 500)
  }
})
