// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { registerServiceWorker } from './pwa'

afterEach(() => {
  delete navigator.serviceWorker
  vi.restoreAllMocks()
})

function setServiceWorker(value) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value,
    configurable: true,
    writable: true,
  })
}

describe('registerServiceWorker', () => {
  it('devuelve null si el navegador no soporta service workers', async () => {
    // jsdom no define navigator.serviceWorker por defecto
    expect('serviceWorker' in navigator).toBe(false)
    await expect(registerServiceWorker()).resolves.toBeNull()
  })

  it('registra /sw.js y devuelve la registration cuando hay soporte', async () => {
    const registration = { scope: '/' }
    const register = vi.fn().mockResolvedValue(registration)
    setServiceWorker({ register })

    const result = await registerServiceWorker()

    expect(register).toHaveBeenCalledWith('/sw.js')
    expect(result).toBe(registration)
  })

  it('devuelve null y no rompe si el registro falla', async () => {
    const register = vi.fn().mockRejectedValue(new Error('boom'))
    setServiceWorker({ register })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(registerServiceWorker()).resolves.toBeNull()
  })
})
