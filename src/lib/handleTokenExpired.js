import { supabase } from './supabase'
import { useAuthStore } from '../store/authStore'

export async function handleTokenExpired(navigate, showToast) {
  showToast('Tu sesión con Spotify expiró. Inicia sesión de nuevo.', 'error')
  useAuthStore.getState().clearSession()
  await supabase.auth.signOut()
  navigate('/login', { replace: true })
}
