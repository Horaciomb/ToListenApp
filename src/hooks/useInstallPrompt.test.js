// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInstallPrompt } from './useInstallPrompt'

// Simula el evento beforeinstallprompt del navegador.
function makeInstallEvent(outcome = 'accepted') {
  const event = new Event('beforeinstallprompt')
  event.preventDefault = vi.fn()
  event.prompt = vi.fn()
  event.userChoice = Promise.resolve({ outcome })
  return event
}

describe('useInstallPrompt', () => {
  it('no se puede instalar antes de recibir el evento', () => {
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.canInstall).toBe(false)
    expect(result.current.installed).toBe(false)
  })

  it('habilita la instalación al recibir beforeinstallprompt (y previene el default)', () => {
    const { result } = renderHook(() => useInstallPrompt())
    const event = makeInstallEvent()

    act(() => {
      window.dispatchEvent(event)
    })

    expect(event.preventDefault).toHaveBeenCalled()
    expect(result.current.canInstall).toBe(true)
  })

  it('promptInstall dispara el prompt, devuelve el outcome y deshabilita la instalación', async () => {
    const { result } = renderHook(() => useInstallPrompt())
    const event = makeInstallEvent('accepted')

    act(() => {
      window.dispatchEvent(event)
    })

    let outcome
    await act(async () => {
      outcome = await result.current.promptInstall()
    })

    expect(event.prompt).toHaveBeenCalled()
    expect(outcome).toBe('accepted')
    expect(result.current.canInstall).toBe(false)
  })

  it('promptInstall devuelve null si no hay evento diferido', async () => {
    const { result } = renderHook(() => useInstallPrompt())

    let outcome
    await act(async () => {
      outcome = await result.current.promptInstall()
    })

    expect(outcome).toBeNull()
  })

  it('marca installed y oculta la instalación al recibir appinstalled', () => {
    const { result } = renderHook(() => useInstallPrompt())

    act(() => {
      window.dispatchEvent(makeInstallEvent())
    })
    expect(result.current.canInstall).toBe(true)

    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })

    expect(result.current.installed).toBe(true)
    expect(result.current.canInstall).toBe(false)
  })
})
