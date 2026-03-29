// Gestion de la couleur d'accent personnalisable

export const ACCENT_COLORS = [
  { label: 'Violet', value: '#6C5CE7' },
  { label: 'Bleu', value: '#0984E3' },
  { label: 'Vert', value: '#00B894' },
  { label: 'Rouge', value: '#D63031' },
  { label: 'Orange', value: '#E17055' },
  { label: 'Rose', value: '#FD79A8' },
] as const

const STORAGE_KEY = 'kaku-accent'

export function loadAccentColor(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      applyAccentColor(saved)
    }
  } catch { /* ignore */ }
}

export function setAccentColor(hex: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, hex)
  } catch { /* ignore */ }
  applyAccentColor(hex)
}

export function getAccentColor(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '#6C5CE7'
  } catch {
    return '#6C5CE7'
  }
}

function applyAccentColor(hex: string): void {
  document.documentElement.style.setProperty('--accent', hex)
  // Version claire : hex + '33' (20% opacity en alpha hex)
  document.documentElement.style.setProperty('--accent-light', hex + '33')
}
