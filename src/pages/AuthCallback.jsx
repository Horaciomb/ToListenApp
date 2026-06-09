import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // Si Supabase redirigió con error en la URL, ir a login directamente
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) {
      console.error('Auth error:', params.get('error_description'))
      navigate('/login', { replace: true })
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      navigate(session ? '/list' : '/login', { replace: true })
    })
  }, [navigate])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <span className="text-gray-400 text-sm">Iniciando sesión...</span>
    </div>
  )
}
