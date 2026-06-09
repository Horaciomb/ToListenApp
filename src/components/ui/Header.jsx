import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'

export default function Header() {
  const user = useAuthStore(s => s.user)
  const clearSession = useAuthStore(s => s.clearSession)
  const setSearchModalOpen = useUiStore(s => s.setSearchModalOpen)
  const location = useLocation()

  const handleLogout = async () => {
    clearSession()
    await supabase.auth.signOut()
  }

  const avatarUrl = user?.user_metadata?.avatar_url
  const displayName = user?.user_metadata?.full_name || user?.email

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-white font-bold text-lg">🎵 ToListen</span>
          <nav className="flex items-center gap-1">
            <Link
              to="/list"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/list'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              Pendientes
            </Link>
            <Link
              to="/history"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/history'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              Historial
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSearchModalOpen(true)}
            className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
          >
            + Añadir álbum
          </button>

          <div className="flex items-center gap-2">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300">
                {displayName?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white text-xs transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
