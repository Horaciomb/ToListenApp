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

export function useAddAlbum() {
  const queryClient = useQueryClient()
  const userId = useAuthStore(s => s.user?.id)

  return useMutation({
    mutationFn: async (albumFromSearch) => {
      const details = await getAlbumDetails(albumFromSearch.id)

      const cacheEntry = buildAlbumCacheEntry(details)
      const { error: cacheError } = await supabase
        .from('albums_cache')
        .upsert(cacheEntry, { onConflict: 'spotify_album_id' })
      if (cacheError) throw cacheError

      const { error: insertError } = await supabase
        .from('user_albums')
        .insert({ user_id: userId, spotify_album_id: albumFromSearch.id, status: 'pending' })

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
