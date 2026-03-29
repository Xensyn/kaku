// Store global de l'application (navigation, thème)

import { create } from 'zustand'

export type AppView = 'home' | 'review' | 'editor' | 'settings' | 'browse' | 'deck-settings' | 'stats' | 'search' | 'import'

export type Theme = 'dark' | 'light'

export type NavigationDirection = 'forward' | 'back'

interface AppState {
  currentView: AppView
  previousView: AppView
  selectedDeckId: string | null
  editingCardId: string | null
  theme: Theme
  navigationDirection: NavigationDirection

  navigate: (view: AppView) => void
  goBack: () => void
  selectDeck: (deckId: string | null) => void
  editCard: (cardId: string | null) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

// Charger le thème depuis localStorage
function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem('kaku-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* ignore */ }
  return 'dark'
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'home',
  previousView: 'home',
  selectedDeckId: null,
  editingCardId: null,
  theme: loadTheme(),
  navigationDirection: 'forward',

  navigate: (view) =>
    set((state) => ({
      currentView: view,
      previousView: state.currentView,
      navigationDirection: 'forward',
    })),

  goBack: () =>
    set((state) => ({
      currentView: state.previousView,
      previousView: 'home',
      navigationDirection: 'back',
    })),

  selectDeck: (deckId) => set({ selectedDeckId: deckId }),

  editCard: (cardId) => set({ editingCardId: cardId }),

  setTheme: (theme) => {
    localStorage.setItem('kaku-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
  },

  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('kaku-theme', newTheme)
      document.documentElement.setAttribute('data-theme', newTheme)
      return { theme: newTheme }
    }),
}))
