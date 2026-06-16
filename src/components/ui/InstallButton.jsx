import { useInstallPrompt } from '../../hooks/useInstallPrompt'

// Botón para instalar la PWA. Solo se muestra cuando el navegador disparó
// `beforeinstallprompt` (instalable y todavía no instalada).
export default function InstallButton() {
  const { canInstall, promptInstall } = useInstallPrompt()

  if (!canInstall) return null

  return (
    <button
      onClick={promptInstall}
      className="text-gray-400 hover:text-white text-xs font-medium transition-colors flex items-center gap-1"
      title="Instalar app"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
      </svg>
      <span className="hidden sm:inline">Instalar</span>
    </button>
  )
}
