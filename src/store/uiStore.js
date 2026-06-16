import { create } from 'zustand'

export const TOAST = {
  albumAdded:      '✓ Añadido a tu lista',
  markedListened:  '✓ Marcado como escuchado',
  revertedPending: '✓ Vuelto a pendientes',
  albumDeleted:    'Eliminado de tu lista',
  notesSaved:      '✓ Nota guardada',
  tokenExpired:    'Tu sesión expiró. Inicia sesión de nuevo.',
  genericError:    'Ocurrió un error. Intenta de nuevo.',
}

export const useUiStore = create((set) => ({
  isSearchModalOpen: false,
  setSearchModalOpen: (v) => set({ isSearchModalOpen: v }),

  toast: null,
  showToast: (message, type = 'success') => {
    set({ toast: { message, type, id: Date.now() } })
    setTimeout(() => set({ toast: null }), 3500)
  },
}))
