import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  session: null,
  user: null,
  spotifyToken: null,
  loadingInitialSession: true,

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
