import { NavLink, useLocation } from 'react-router-dom'
import { useUiStore } from '../../store/uiStore'

export default function BottomNav() {
  const setSearchModalOpen = useUiStore(s => s.setSearchModalOpen)
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-gray-900 border-t border-gray-800 flex items-center h-16 px-2 safe-area-inset-bottom">
      {/* Pendientes */}
      <NavLink
        to="/list"
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-lg transition-colors ${
          isActive('/list') ? 'text-white' : 'text-gray-500'
        }`}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive('/list') ? 2 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span className="text-[10px] font-medium leading-none">Pendientes</span>
      </NavLink>

      {/* Añadir (botón central elevado) */}
      <div className="flex-1 flex items-center justify-center -mt-5">
        <button
          onClick={() => setSearchModalOpen(true)}
          className="w-14 h-14 bg-green-500 hover:bg-green-400 active:bg-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-900/40 transition-colors"
          aria-label="Añadir álbum"
        >
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Historial */}
      <NavLink
        to="/history"
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-lg transition-colors ${
          isActive('/history') ? 'text-white' : 'text-gray-500'
        }`}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive('/history') ? 2 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[10px] font-medium leading-none">Historial</span>
      </NavLink>
    </nav>
  )
}
