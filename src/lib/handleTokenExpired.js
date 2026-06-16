import { supabase } from './supabase'
import { useAuthStore } from '../store/authStore'
import { TOAST } from '../store/uiStore'

export async function handleTokenExpired(navigate, showToast) {
  showToast(TOAST.tokenExpired, 'error')
  useAuthStore.getState().clearSession()
  await supabase.auth.signOut()
  navigate('/login', { replace: true })
}
