import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  session: null,
  user: null,
  loadingInitialSession: true,

  setSession: (session) => set({
    session,
    user: session?.user ?? null,
  }),

  clearSession: () => set({
    session: null,
    user: null,
  }),

  setLoading: (v) => set({ loadingInitialSession: v }),
}))
