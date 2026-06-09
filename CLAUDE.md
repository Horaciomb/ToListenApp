# CLAUDE.md — Album Tracker

## Descripción del proyecto

Aplicación web personal para gestionar una lista de álbumes musicales pendientes de escuchar.
El usuario inicia sesión con su cuenta de Spotify, busca álbumes en el catálogo de Spotify, los
añade a su lista personal con estado "pendiente", y cuando los escucha los marca como "escuchado"
para conservar un historial. La app **NO reproduce música** — solo gestiona la lista y redirige al
usuario a Spotify para escuchar.

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite |
| Estilos | Tailwind CSS v3 |
| Estado del servidor | TanStack Query v5 |
| Estado global | Zustand v4 |
| Base de datos + Auth | Supabase (PostgreSQL + RLS) |
| Autenticación | Supabase Auth con Spotify como OAuth provider |
| Routing | React Router v6 |
| Deploy | Vercel |
| Lenguaje | JavaScript (sin TypeScript) |

## Variables de entorno (.env)

Las credenciales de Spotify se configuran en el **dashboard de Supabase** (Auth > Providers > Spotify),
NO en el `.env` del proyecto.

```
VITE_SUPABASE_URL=tu_supabase_project_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

Crear también `.env.example` con las mismas claves sin valores para documentar.

---

## Estructura de carpetas

```
album-tracker/
├── public/
├── src/
│   ├── components/
│   │   ├── album/
│   │   │   ├── AlbumCard.jsx         # tarjeta reutilizable (variant: pending | listened)
│   │   │   └── AlbumCardSkeleton.jsx # placeholder de carga
│   │   ├── search/
│   │   │   ├── SearchModal.jsx       # modal de búsqueda de álbumes en Spotify
│   │   │   └── SearchResultItem.jsx  # un resultado de búsqueda con su propio spinner
│   │   └── ui/
│   │       ├── Button.jsx
│   │       ├── Badge.jsx
│   │       ├── EmptyState.jsx
│   │       ├── Modal.jsx
│   │       └── Toast.jsx             # componente visual del toast
│   ├── pages/
│   │   ├── LoginPage.jsx             # página pública con botón "Conectar con Spotify"
│   │   ├── ListPage.jsx              # lista de álbumes pendientes (ruta /list)
│   │   ├── HistoryPage.jsx           # historial de álbumes escuchados (ruta /history)
│   │   └── AuthCallback.jsx          # maneja el redirect de OAuth de Supabase
│   ├── hooks/
│   │   ├── useAlbums.js              # TanStack Query: todas las queries y mutations
│   │   └── useSpotifySearch.js       # búsqueda en Spotify con debounce y anti-stale
│   ├── lib/
│   │   ├── supabase.js               # cliente singleton de Supabase
│   │   ├── spotify.js                # helpers para el API de Spotify
│   │   └── utils.js                  # formatDuration, formatDate, etc.
│   ├── store/
│   │   ├── authStore.js              # Zustand: session, user, spotifyToken, loadingInitialSession
│   │   └── uiStore.js                # Zustand: isSearchModalOpen, toast
│   ├── App.jsx                       # routing + auth bootstrap
│   └── main.jsx
├── vercel.json
├── .env
├── .env.example
└── CLAUDE.md
```

---

## Base de datos — SQL completo

Ejecutar en el SQL Editor de Supabase **en este orden exacto**:

```sql
-- ================================================
-- TABLA: profiles
-- Espejo de auth.users con datos de Spotify.
-- Se crea automáticamente vía trigger al registrarse.
-- ================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  spotify_id  text unique,
  display_name text,
  avatar_url  text,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- ================================================
-- TABLA: albums_cache
-- Cache compartido de metadata de álbumes de Spotify.
-- No tiene user_id. Compartido entre todos los usuarios.
-- NUNCA se borra — solo se upsert.
-- ================================================
create table public.albums_cache (
  spotify_album_id       text primary key,
  name                   text not null,
  artist_name            text not null,        -- artista principal (display rápido)
  artists_json           jsonb not null default '[]', -- todos los artistas completos
  cover_url              text,                 -- imagen 300x300 para tarjetas (puede ser null)
  cover_url_large        text,                 -- imagen 640x640 (puede ser null)
  total_tracks           integer not null default 0,
  duration_ms            bigint not null default 0, -- suma de duration_ms de todos los tracks
  release_date           text,                 -- "2015-09-18" o "2015" según precisión
  release_date_precision text,                 -- "day" | "month" | "year"
  spotify_uri            text not null,        -- "spotify:album:xxx" (NO usar para abrir links)
  spotify_url            text not null,        -- "https://open.spotify.com/album/xxx"
  genres                 jsonb default '[]',
  popularity             integer,
  cached_at              timestamptz default now() not null
);

-- ================================================
-- TABLA: user_albums
-- Lista personal de álbumes por usuario.
-- CONSTRAINT único: un usuario no puede tener el mismo álbum dos veces.
-- ================================================
create table public.user_albums (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  spotify_album_id text not null references public.albums_cache(spotify_album_id),
  status           text not null default 'pending'
                     check (status in ('pending', 'listened')),
  added_at         timestamptz default now() not null,
  listened_at      timestamptz,     -- DEBE ser null cuando status='pending'
  notes            text,            -- campo futuro, no implementar UI en MVP
  constraint unique_user_album unique(user_id, spotify_album_id)  -- ← CRÍTICO
);

-- ================================================
-- ÍNDICES
-- ================================================
create index idx_user_albums_user_id    on public.user_albums(user_id);
create index idx_user_albums_status     on public.user_albums(user_id, status);
create index idx_user_albums_added_at   on public.user_albums(user_id, added_at desc);
create index idx_user_albums_listened   on public.user_albums(user_id, listened_at desc);

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================
alter table public.profiles    enable row level security;
alter table public.albums_cache enable row level security;
alter table public.user_albums  enable row level security;

-- profiles: solo el propio usuario
create policy "profiles: ver propio"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles: actualizar propio"
  on public.profiles for update using (auth.uid() = id);
create policy "profiles: insertar propio"
  on public.profiles for insert with check (auth.uid() = id);

-- albums_cache: cualquier usuario autenticado puede leer y escribir (cache compartido)
create policy "albums_cache: leer autenticado"
  on public.albums_cache for select to authenticated using (true);
create policy "albums_cache: insertar autenticado"
  on public.albums_cache for insert to authenticated with check (true);
create policy "albums_cache: actualizar autenticado"
  on public.albums_cache for update to authenticated using (true);

-- user_albums: cada usuario solo gestiona los suyos
create policy "user_albums: ver propios"
  on public.user_albums for select using (auth.uid() = user_id);
create policy "user_albums: insertar propios"
  on public.user_albums for insert with check (auth.uid() = user_id);
create policy "user_albums: actualizar propios"
  on public.user_albums for update using (auth.uid() = user_id);
create policy "user_albums: eliminar propios"
  on public.user_albums for delete using (auth.uid() = user_id);

-- ================================================
-- TRIGGER: crear profile al registrarse
-- Se ejecuta automáticamente. NO crear profiles manualmente.
-- ================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, spotify_id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'provider_id',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## store/authStore.js — Shape completo de Zustand

```javascript
import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  session: null,
  user: null,
  spotifyToken: null,
  loadingInitialSession: true,   // ← empieza en true, nunca muestra ruta protegida hasta que sea false

  setSession: (session) => set({
    session,
    user: session?.user ?? null,
    spotifyToken: session?.provider_token ?? null,
  }),

  clearSession: () => set({
    session: null,
    user: null,
    spotifyToken: null,
  }),

  setLoading: (v) => set({ loadingInitialSession: v }),
}))
```

---

## Auth Bootstrap — patrón obligatorio en App.jsx

El listener de auth DEBE vivir en `App.jsx` (o un componente raíz que monte una sola vez).
Nunca ponerlo dentro de páginas o componentes que montan/desmontan.

```javascript
// App.jsx
import { useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/authStore'

export default function App() {
  const setSession = useAuthStore(s => s.setSession)
  const setLoading = useAuthStore(s => s.setLoading)

  useEffect(() => {
    // 1. Obtener sesión inicial (cubre el caso de refresh de página)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)  // ← CRÍTICO: sin esto ProtectedRoute nunca deja pasar
    })

    // 2. Escuchar cambios futuros (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // ... Routes aquí
  )
}
```

---

## ProtectedRoute — con guarda de carga inicial

```javascript
// No redirigir hasta saber si hay sesión (evita flash de /login en refresh)
function ProtectedRoute({ children }) {
  const loadingInitialSession = useAuthStore(s => s.loadingInitialSession)
  const session = useAuthStore(s => s.session)

  if (loadingInitialSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-gray-400 text-sm">Cargando...</span>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  return children
}
```

---

## Autenticación con Spotify via Supabase

### Configuración en Supabase dashboard
1. Authentication > Providers > Spotify → habilitar
2. Pegar Client ID y Client Secret de la Spotify Developer App
3. En la Spotify Developer App, añadir como Redirect URI:
   `https://[tu-proyecto-id].supabase.co/auth/v1/callback`

### Login desde React
```javascript
const handleLogin = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'spotify',
    options: {
      scopes: 'user-read-email user-read-private',
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  if (error) console.error('Login error:', error)
}
```

### AuthCallback
```javascript
export default function AuthCallback() {
  const navigate = useNavigate()
  useEffect(() => {
    // Supabase maneja el intercambio de código automáticamente.
    // Solo esperar la sesión y redirigir.
    supabase.auth.getSession().then(({ data: { session } }) => {
      navigate(session ? '/list' : '/login', { replace: true })
    })
  }, [navigate])
  return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="text-gray-400 text-sm">Iniciando sesión...</span>
    </div>
  )
}
```

### Manejo de token expirado de Spotify

Cuando `spotify.js` lanza `'SPOTIFY_TOKEN_EXPIRED'`, ejecutar este flujo completo:

```javascript
// Puede llamarse desde cualquier componente o hook
export async function handleTokenExpired(navigate, showToast) {
  showToast('Tu sesión con Spotify expiró. Inicia sesión de nuevo.', 'error')
  useAuthStore.getState().clearSession()
  await supabase.auth.signOut()
  navigate('/login', { replace: true })
}
```

---

## lib/spotify.js

```javascript
const SPOTIFY_API = 'https://api.spotify.com/v1'

async function spotifyFetch(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (res.status === 401) throw new Error('SPOTIFY_TOKEN_EXPIRED')
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`)
  return res.json()
}

// Búsqueda rápida — NO incluye duration_ms ni lista de tracks
export async function searchAlbums(query, token) {
  const params = new URLSearchParams({ q: query, type: 'album', limit: '10' })
  const data = await spotifyFetch(`${SPOTIFY_API}/search?${params}`, token)
  return data.albums.items
}

// Detalle completo — incluye tracks para calcular duration_ms
// SIEMPRE llamar esto antes de insertar en albums_cache
export async function getAlbumDetails(albumId, token) {
  return spotifyFetch(`${SPOTIFY_API}/albums/${albumId}`, token)
}

// Construye el objeto listo para upsert en albums_cache
// Requiere el resultado de getAlbumDetails (no de searchAlbums)
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
```

---

## lib/utils.js

```javascript
export function formatDuration(ms) {
  if (!ms || ms === 0) return '--'
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes} min`
}

export function formatDate(isoString) {
  if (!isoString) return null  // retornar null para que el componente lo oculte
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
```

---

## Shape estándar de datos para componentes

Cuando Supabase devuelve `.select('*, albums_cache(*)')`, el resultado tiene esta forma:

```javascript
// Lo que devuelve Supabase:
{
  id: 'uuid',
  user_id: 'uuid',
  spotify_album_id: 'text',
  status: 'pending',
  added_at: '2024-01-15T...',
  listened_at: null,
  notes: null,
  albums_cache: {          // ← objeto anidado con todos los campos de albums_cache
    spotify_album_id: '...',
    name: 'To Pimp a Butterfly',
    artist_name: 'Kendrick Lamar',
    cover_url: '...',
    total_tracks: 16,
    duration_ms: 3865000,
    spotify_url: 'https://open.spotify.com/album/...',
    ...
  }
}
```

**Patrón de destructuring obligatorio en todas las páginas:**

```javascript
// En ListPage.jsx y HistoryPage.jsx, al renderizar AlbumCard:
{data.map(item => {
  const { albums_cache: album, ...userAlbum } = item
  return (
    <AlbumCard
      key={userAlbum.id}
      album={album}         // ← fila de albums_cache
      userAlbum={userAlbum} // ← fila de user_albums (sin albums_cache)
      variant="pending"
      ...
    />
  )
})}
```

Los componentes (AlbumCard, SearchResultItem, etc.) SIEMPRE reciben `album` y `userAlbum` como props separadas.
Nunca pasar el objeto combinado `item` directamente — evita confusión entre `item.name` e `item.albums_cache.name`.

---

## Fallbacks visuales — reglas para todos los componentes

**Imagen de portada (`album.cover_url`):**
Si `cover_url` es `null`, mostrar un div placeholder con fondo neutro e ícono de nota musical:
```jsx
{album.cover_url ? (
  <img src={album.cover_url} alt={album.name} className="w-full h-full object-cover" />
) : (
  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
    <span className="text-gray-500 text-3xl">🎵</span>
  </div>
)}
```

**Duración (`album.duration_ms`):**
Usar `formatDuration(album.duration_ms)` — la función retorna `'--'` si es 0 o null.

**Fecha (`userAlbum.listened_at`):**
`formatDate()` retorna `null` si el valor es null. El componente debe ocultar la línea de fecha si es null:
```jsx
{formatDate(userAlbum.listened_at) && (
  <p>Escuchado el {formatDate(userAlbum.listened_at)}</p>
)}
```

**Nombre de artista:**
`'Artista desconocido'` se guarda en `albums_cache.artist_name` por `buildAlbumCacheEntry`. No necesita fallback en UI.

---

## Layout responsivo

```
Mobile (< 640px):   grid-cols-1  ← card en layout horizontal (portada a la izquierda, info a la derecha)
Tablet (≥ 640px):   grid-cols-2
Desktop (≥ 1024px): grid-cols-3
```

Clase Tailwind para el grid en ListPage y HistoryPage:
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

En móvil, la AlbumCard usa layout horizontal (flex-row) con la portada de tamaño fijo (ej: 80x80px o 96x96px).
En sm+ puede cambiar a layout vertical (flex-col) con portada cuadrada más grande.

---

## store/uiStore.js — Toast incluido

```javascript
import { create } from 'zustand'

// Mensajes de toast exactos — usar siempre estas constantes
export const TOAST = {
  albumAdded:      '✓ Añadido a tu lista',
  markedListened:  '✓ Marcado como escuchado',
  revertedPending: '✓ Vuelto a pendientes',
  albumDeleted:    'Eliminado de tu lista',
  tokenExpired:    'Tu sesión con Spotify expiró. Inicia sesión de nuevo.',
  genericError:    'Ocurrió un error. Intenta de nuevo.',
}

export const useUiStore = create((set) => ({
  isSearchModalOpen: false,
  setSearchModalOpen: (v) => set({ isSearchModalOpen: v }),

  toast: null,   // { message: string, type: 'success' | 'error' | 'info' }
  showToast: (message, type = 'success') => {
    set({ toast: { message, type, id: Date.now() } })
    setTimeout(() => set({ toast: null }), 3500)
  },
}))
```

El componente `Toast.jsx` se renderiza en la raíz de la app (en `App.jsx`) y observa `useUiStore(s => s.toast)`.

---

## Decisiones de UX — cerradas, no reinterpretar

**Confirmaciones:**
- **Eliminar** → siempre usar `window.confirm('¿Eliminar este álbum de tu lista?')` antes de la mutación
- **Marcar como escuchado** → SIN confirmación previa, directamente. Mostrar toast de éxito
- **Volver a pendiente** → SIN confirmación previa, directamente. Mostrar toast de éxito

**Estado "En tu lista" en el modal de búsqueda:**
- Cubre TANTO `pending` como `listened`
- Si el álbum existe con status `'pending'` → mostrar badge "En tu lista"
- Si el álbum existe con status `'listened'` → mostrar badge "Ya escuchado"
- En NINGÚN caso mostrar el botón "+ Añadir" si ya existe en cualquier estado
- NUNCA intentar insertar un álbum duplicado — el constraint `unique_user_album` lo rechazaría con código `23505`

**Al cerrar el modal de búsqueda:**
- Limpiar query, resultados y estado de error
- El modal llama `search.clear()` en su handler de cierre

---

## hooks/useSpotifySearch.js — Implementación completa con anti-stale

Usar estado local (`useState`), **no** TanStack Query para la búsqueda.
El flag `cancelled` previene que respuestas de búsquedas anteriores sobreescriban resultados actuales.

```javascript
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { searchAlbums } from '../lib/spotify'

export function useSpotifySearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const spotifyToken = useAuthStore(s => s.spotifyToken)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false  // ← cada ejecución del effect tiene su propio flag

    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await searchAlbums(query, spotifyToken)
        if (!cancelled) setResults(data)          // ← ignorar si ya es stale
      } catch (err) {
        if (!cancelled) {
          if (err.message === 'SPOTIFY_TOKEN_EXPIRED') throw err  // propagar para manejarlo arriba
          setError('Error al buscar. Intenta de nuevo.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 400)

    return () => {
      cancelled = true    // ← marca la búsqueda anterior como obsoleta
      clearTimeout(timer)
    }
  }, [query, spotifyToken])

  // Llamar al cerrar el modal para limpiar todo
  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    setLoading(false)
  }, [])

  return { query, setQuery, results, loading, error, clear }
}
```

---

## hooks/useAlbums.js — Todas las queries y mutations

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { getAlbumDetails, buildAlbumCacheEntry } from '../lib/spotify'

// ─── QUERIES ──────────────────────────────────────────────────────────────────

export function usePendingAlbums() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery({
    queryKey: ['user-albums', 'pending', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_albums')
        .select('*, albums_cache(*)')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('added_at', { ascending: false })
      if (error) throw error
      return data
    }
  })
}

export function useListenedAlbums() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery({
    queryKey: ['user-albums', 'listened', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_albums')
        .select('*, albums_cache(*)')
        .eq('user_id', userId)
        .eq('status', 'listened')
        .order('listened_at', { ascending: false })
      if (error) throw error
      return data
    }
  })
}

// IDs de todos los álbumes del usuario (para chequeo de duplicados en búsqueda)
// Retorna un Map: spotify_album_id → status ('pending' | 'listened')
export function useMyAlbumIds() {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery({
    queryKey: ['user-album-ids', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_albums')
        .select('spotify_album_id, status')
        .eq('user_id', userId)
      if (error) throw error
      return new Map(data.map(item => [item.spotify_album_id, item.status]))
    }
  })
}

// ─── MUTATIONS ────────────────────────────────────────────────────────────────

// Flujo completo de añadir un álbum:
// 1. Obtener detalles completos de Spotify (para duration_ms)
// 2. Upsert en albums_cache
// 3. Insert en user_albums
// 4. Si ya existe (error 23505) → ignorar silenciosamente
export function useAddAlbum() {
  const queryClient = useQueryClient()
  const userId = useAuthStore(s => s.user?.id)
  const spotifyToken = useAuthStore(s => s.spotifyToken)

  return useMutation({
    mutationFn: async (albumFromSearch) => {
      // Paso 1: detalles completos (necesario para duration_ms)
      const details = await getAlbumDetails(albumFromSearch.id, spotifyToken)

      // Paso 2: guardar/actualizar en cache compartido
      const cacheEntry = buildAlbumCacheEntry(details)
      const { error: cacheError } = await supabase
        .from('albums_cache')
        .upsert(cacheEntry, { onConflict: 'spotify_album_id' })
      if (cacheError) throw cacheError

      // Paso 3: insertar en lista del usuario
      const { error: insertError } = await supabase
        .from('user_albums')
        .insert({ user_id: userId, spotify_album_id: albumFromSearch.id, status: 'pending' })

      // Si ya existe → no es error, simplemente ya lo tiene
      if (insertError?.code === '23505') return
      if (insertError) throw insertError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-albums', 'pending', userId] })
      queryClient.invalidateQueries({ queryKey: ['user-album-ids', userId] })
    }
  })
}

export function useMarkListened() {
  const queryClient = useQueryClient()
  const userId = useAuthStore(s => s.user?.id)
  return useMutation({
    mutationFn: async (userAlbumId) => {
      const { error } = await supabase
        .from('user_albums')
        .update({ status: 'listened', listened_at: new Date().toISOString() })
        .eq('id', userAlbumId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-albums', 'pending', userId] })
      queryClient.invalidateQueries({ queryKey: ['user-albums', 'listened', userId] })
      queryClient.invalidateQueries({ queryKey: ['user-album-ids', userId] })
    }
  })
}

export function useRevertPending() {
  const queryClient = useQueryClient()
  const userId = useAuthStore(s => s.user?.id)
  return useMutation({
    mutationFn: async (userAlbumId) => {
      const { error } = await supabase
        .from('user_albums')
        .update({ status: 'pending', listened_at: null })
        .eq('id', userAlbumId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-albums', 'pending', userId] })
      queryClient.invalidateQueries({ queryKey: ['user-albums', 'listened', userId] })
      queryClient.invalidateQueries({ queryKey: ['user-album-ids', userId] })
    }
  })
}

// Hard delete de user_albums. NUNCA borrar de albums_cache.
export function useDeleteAlbum() {
  const queryClient = useQueryClient()
  const userId = useAuthStore(s => s.user?.id)
  return useMutation({
    mutationFn: async (userAlbumId) => {
      const { error } = await supabase
        .from('user_albums')
        .delete()
        .eq('id', userAlbumId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-albums', 'pending', userId] })
      queryClient.invalidateQueries({ queryKey: ['user-albums', 'listened', userId] })
      queryClient.invalidateQueries({ queryKey: ['user-album-ids', userId] })
    }
  })
}
```

---

## AlbumCard — Especificación del componente

### Props
```javascript
<AlbumCard
  album={albumsCacheRow}        // fila de albums_cache (viene del destructuring)
  userAlbum={userAlbumsRow}     // fila de user_albums (sin albums_cache)
  variant="pending"             // 'pending' | 'listened'
  onMarkListened={fn}           // (userAlbumId) => void
  onRevertPending={fn}          // (userAlbumId) => void
  onDelete={fn}                 // (userAlbumId) => void
/>
```

### Información que muestra (ambas variantes)
- Portada: `album.cover_url` con fallback al placeholder de 🎵
- Nombre del álbum: `album.name`
- Artista principal: `album.artist_name`
- Tracks y duración: `{album.total_tracks} canciones · {formatDuration(album.duration_ms)}`
- Año: `getReleaseYear(album.release_date)`
- Fecha adicional según variante (ver abajo)

### Por variante
**pending:**
- Muestra: "Añadido el {formatDate(userAlbum.added_at)}"
- Botones: [Escuchar en Spotify] [Marcar como escuchado] [Eliminar]

**listened:**
- Muestra: "Escuchado el {formatDate(userAlbum.listened_at)}" — ocultar si `listened_at` es null
- Botones: [Escuchar de nuevo] [Volver a pendiente] [Eliminar del historial]

### El botón "Escuchar"
```javascript
<a
  href={album.spotify_url}
  target="_blank"
  rel="noopener noreferrer"
>
  Escuchar en Spotify
</a>
```
Siempre usar `album.spotify_url`. NUNCA `album.spotify_uri`.

### Confirmación de eliminar (en el componente, no en la página)
```javascript
const handleDelete = () => {
  if (!window.confirm('¿Eliminar este álbum de tu lista?')) return
  onDelete(userAlbum.id)
}
```

---

## SearchModal y SearchResultItem — Especificación completa

### SearchModal
- Usa `useSpotifySearch()` para query, resultados, loading y clear
- Usa `useMyAlbumIds()` para saber qué álbumes ya tiene el usuario
- Usa `useAddAlbum()` para la mutación de añadir
- Al cerrar: llamar `search.clear()` + `setSearchModalOpen(false)`
- El input muestra spinner de búsqueda global mientras `search.loading === true`
- Los resultados individuales tienen su propio spinner (ver SearchResultItem)

```javascript
// Dentro de SearchModal, para calcular el estado de cada resultado:
const { data: myAlbumIds = new Map() } = useMyAlbumIds()

// Al renderizar cada resultado:
const existingStatus = myAlbumIds.get(album.id)  // 'pending', 'listened', o undefined
```

### SearchResultItem — Spinner por ítem, no global

```javascript
// Cada resultado gestiona su propio estado de carga
export function SearchResultItem({ album, existingStatus, onAdd }) {
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    setIsAdding(true)
    try {
      await onAdd(album)  // ← llama useAddAlbum().mutateAsync
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div>
      {/* portada, nombre, artista, año */}

      {existingStatus === 'pending' && <span>En tu lista</span>}
      {existingStatus === 'listened' && <span>Ya escuchado</span>}
      {!existingStatus && (
        <button onClick={handleAdd} disabled={isAdding}>
          {isAdding ? '...' : '+ Añadir'}
        </button>
      )}
    </div>
  )
}
```

El spinner vive en cada `SearchResultItem`, no en el modal. Así el usuario puede ver todos los
resultados mientras uno está siendo añadido.

---

## Routing (App.jsx)

```
/               → redirect a /list si autenticado (y loadingInitialSession === false), sino a /login
/login          → LoginPage (pública, redirige a /list si ya hay sesión)
/auth/callback  → AuthCallback
/list           → ListPage (envuelta en ProtectedRoute)
/history        → HistoryPage (envuelta en ProtectedRoute)
```

---

## vercel.json

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## Reglas de negocio — NO violar nunca

1. **Nunca borrar de `albums_cache`** — solo se eliminan filas de `user_albums`.
   El cache es permanente y compartido entre todos los usuarios.

2. **El botón "Escuchar" siempre usa `album.spotify_url`** (link web `open.spotify.com`).
   NUNCA usar `album.spotify_uri`.

3. **Al marcar como escuchado: `status = 'listened'` Y `listened_at = now()`**.
   Nunca dejar `listened_at` como null si status es 'listened'.

4. **Al revertir a pendiente: `status = 'pending'` Y `listened_at = null`**.
   Nunca dejar la fecha antigua cuando se revierte.

5. **Siempre llamar `getAlbumDetails` antes de insertar en `albums_cache`**.
   `searchAlbums` no retorna `duration_ms` — se necesita el detalle completo.

6. **La constraint `unique_user_album` es la fuente de verdad**. Si el insert retorna
   error code `23505`, ignorar silenciosamente — el álbum ya existe en la lista.

7. **"En tu lista" cubre pending Y listened** — nunca mostrar "+ Añadir" si el álbum ya
   existe en cualquier estado. Usar `useMyAlbumIds()` para el chequeo.

8. **Orden de las listas:**
   - Pendientes → `added_at DESC`
   - Historial → `listened_at DESC`

9. **El `user_id` en inserts siempre es el del usuario autenticado** — tomarlo del store,
   nunca de parámetros externos.

10. **`notes` existe en el schema para uso futuro** — no implementar UI para este campo en MVP.

---

## Fases de desarrollo (TODO)

### Fase 1 — Setup y autenticación
- [ ] `npm create vite@latest album-tracker -- --template react`
- [ ] Instalar: `npm install @supabase/supabase-js @tanstack/react-query zustand react-router-dom`
- [ ] Instalar dev: `npm install -D tailwindcss postcss autoprefixer` + `npx tailwindcss init -p`
- [ ] Configurar `tailwind.config.js` (content paths)
- [ ] `src/lib/supabase.js` — cliente singleton
- [ ] `src/store/authStore.js` — con todos los campos del spec
- [ ] `src/store/uiStore.js` — con toast y isSearchModalOpen
- [ ] Auth bootstrap en `App.jsx` con `onAuthStateChange`
- [ ] `LoginPage.jsx` — botón "Conectar con Spotify"
- [ ] `AuthCallback.jsx`
- [ ] `ProtectedRoute` con guarda de `loadingInitialSession`
- [ ] Header con avatar y botón de logout
- [ ] Componente `Toast.jsx` en raíz de App
- [ ] Verificar flujo: login → callback → /list → logout sin flash ni parpadeos

### Fase 2 — Base de datos
- [ ] Ejecutar SQL completo en Supabase SQL Editor
- [ ] Verificar que el trigger crea el profile automáticamente al primer login
- [ ] Verificar RLS: el usuario solo ve sus `user_albums`
- [ ] Confirmar constraint `unique_user_album` activo

### Fase 3 — Lista de pendientes (core)
- [ ] `hooks/useAlbums.js`: `usePendingAlbums`, `useMarkListened`, `useDeleteAlbum`
- [ ] `ListPage.jsx` con grid responsivo (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- [ ] `AlbumCard.jsx` variant 'pending' con destructuring correcto
- [ ] `AlbumCardSkeleton.jsx`
- [ ] `EmptyState.jsx` — "Tu lista está vacía. Busca un álbum para empezar."
- [ ] Fallback de imagen con placeholder 🎵
- [ ] Acción marcar como escuchado → toast `TOAST.markedListened`
- [ ] Acción eliminar → `window.confirm` + toast `TOAST.albumDeleted`

### Fase 4 — Búsqueda y añadir
- [ ] `lib/spotify.js` completo
- [ ] `hooks/useSpotifySearch.js` con flag `cancelled`
- [ ] `hooks/useAlbums.js`: agregar `useMyAlbumIds` y `useAddAlbum`
- [ ] `SearchModal.jsx` con cierre limpio (llama `search.clear()`)
- [ ] `SearchResultItem.jsx` con spinner individual por ítem
- [ ] Indicadores "En tu lista" / "Ya escuchado" en resultados
- [ ] FAB o botón en header para abrir el modal
- [ ] Toast `TOAST.albumAdded` al añadir con éxito

### Fase 5 — Historial
- [ ] `hooks/useAlbums.js`: agregar `useListenedAlbums` y `useRevertPending`
- [ ] `HistoryPage.jsx` con grid responsivo
- [ ] `AlbumCard.jsx` variant 'listened'
- [ ] Acción volver a pendiente → toast `TOAST.revertedPending`
- [ ] Acción eliminar del historial → `window.confirm` + toast `TOAST.albumDeleted`

### Fase 6 — Polish y deploy
- [ ] Manejo de `SPOTIFY_TOKEN_EXPIRED` en todos los puntos → `handleTokenExpired()`
- [ ] Loading states visibles en todas las mutaciones (botones con spinner o disabled)
- [ ] `vercel.json`
- [ ] Variables de entorno en Vercel dashboard
- [ ] Añadir dominio Vercel a Redirect URIs en Spotify Developer Dashboard
- [ ] Añadir dominio Vercel a Site URLs en Supabase Auth settings
- [ ] Probar flujo completo en producción

---

## Notas de configuración de Spotify Developer

1. Crear app en https://developer.spotify.com/dashboard
2. Añadir Redirect URIs:
   - `https://[id-proyecto].supabase.co/auth/v1/callback` (Supabase maneja esto)
   - `http://localhost:5173/auth/callback` (desarrollo local)
3. Copiar Client ID y Client Secret al dashboard de Supabase (Auth > Providers > Spotify)
4. La app estará en modo desarrollo (25 usuarios máximo) — suficiente para uso personal

---

## Contexto del desarrollador

- Stack familiar: React + Vite + TanStack Query + Zustand (mismo stack que rrhh-app en BEX)
- Estilo de código: JavaScript sin TypeScript, componentes funcionales con hooks
- El proyecto es personal — priorizar velocidad de desarrollo sobre arquitectura perfecta
- Si algo no está especificado en este CLAUDE.md, elegir la opción más simple
