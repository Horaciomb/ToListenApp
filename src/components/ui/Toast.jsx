import { useUiStore } from '../../store/uiStore'

export default function Toast() {
  const toast = useUiStore(s => s.toast)

  if (!toast) return null

  const colors = {
    success: 'bg-green-600 text-white',
    error:   'bg-red-600 text-white',
    info:    'bg-blue-600 text-white',
  }

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${colors[toast.type] ?? colors.success}`}>
      {toast.message}
    </div>
  )
}
