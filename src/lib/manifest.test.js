import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Valida que el manifest cumpla los requisitos mínimos de instalabilidad PWA.
const manifestPath = fileURLToPath(new URL('../../public/manifest.webmanifest', import.meta.url))
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

describe('manifest.webmanifest', () => {
  it('tiene los campos obligatorios', () => {
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toMatch(/^#/)
    expect(manifest.background_color).toMatch(/^#/)
  })

  it('incluye íconos de 192x192 y 512x512 PNG', () => {
    const sizes = manifest.icons.map((i) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    manifest.icons.forEach((icon) => {
      expect(icon.type).toBe('image/png')
      expect(icon.src).toMatch(/^\/.+\.png$/)
    })
  })

  it('declara al menos un ícono maskable', () => {
    const purposes = manifest.icons.map((i) => i.purpose)
    expect(purposes).toContain('maskable')
  })
})
