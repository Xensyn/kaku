import type { CSSProperties } from 'react'
import { Home, Plus, Settings } from 'lucide-react'
import { useAppStore, type AppView } from '../../store/useAppStore'

interface NavItem {
  view: AppView
  label: string
  icon: typeof Home
}

const NAV_ITEMS: NavItem[] = [
  { view: 'home', label: 'Accueil', icon: Home },
  { view: 'editor', label: 'Ajouter', icon: Plus },
  { view: 'settings', label: 'Réglages', icon: Settings },
]

export function BottomNav() {
  const { currentView, navigate, selectedDeckId } = useAppStore()

  // Masquer la nav pendant la révision
  if (currentView === 'review') return null

  const navStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 'var(--nav-height)',
    paddingBottom: 'var(--safe-bottom, 0px)',
    background: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
  }

  return (
    <nav style={navStyle}>
      {NAV_ITEMS.map(({ view, label, icon: Icon }) => {
        const isActive = currentView === view
        const itemStyle: CSSProperties = {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          minWidth: '64px',
          minHeight: 'var(--touch-min)',
          padding: '6px 12px',
          border: 'none',
          background: 'transparent',
          color: isActive ? 'var(--accent)' : 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'color var(--transition)',
          fontSize: '11px',
          fontWeight: isActive ? 600 : 400,
        }

        return (
          <button
            key={view}
            style={itemStyle}
            onClick={() => {
              if (view === 'editor' && !selectedDeckId) {
                // Aller à l'accueil si aucun deck sélectionné
                navigate('home')
                return
              }
              navigate(view)
            }}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
