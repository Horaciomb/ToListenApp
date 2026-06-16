// Registra el service worker si el navegador lo soporta.
// Devuelve la registration, o null si no hay soporte o falla el registro.
export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null)
  }
  return navigator.serviceWorker
    .register('/sw.js')
    .catch((err) => {
      console.error('Service worker registration failed:', err)
      return null
    })
}
