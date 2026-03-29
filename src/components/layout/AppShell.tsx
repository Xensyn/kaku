import { useRef, useEffect, type ReactNode, type CSSProperties } from 'react'
import { BottomNav } from './BottomNav'
import { useAppStore } from '../../store/useAppStore'

interface AppShellProps {
  children: ReactNode
}

// Vues considérées comme modales (transition fade)
const MODAL_VIEWS = new Set(['editor', 'review', 'settings', 'deck-settings'])

export function AppShell({ children }: AppShellProps) {
  const { currentView, navigationDirection } = useAppStore()
  const containerRef = useRef<HTMLDivElement>(null)

  // Appliquer la classe d'animation à chaque changement de vue
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const isModal = MODAL_VIEWS.has(currentView)
    const className = isModal
      ? 'view-enter-modal'
      : navigationDirection === 'forward'
        ? 'view-enter-forward'
        : 'view-enter-back'

    el.classList.remove('view-enter-forward', 'view-enter-back', 'view-enter-modal')
    // Force reflow pour relancer l'animation
    void el.offsetWidth
    el.classList.add(className)

    const onEnd = () => el.classList.remove(className)
    el.addEventListener('animationend', onEnd, { once: true })
    return () => el.removeEventListener('animationend', onEnd)
  }, [currentView, navigationDirection])

  const shellStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    width: '100%',
    maxWidth: '600px',
    margin: '0 auto',
    background: 'var(--bg-primary)',
  }

  const contentStyle: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  }

  return (
    <div style={shellStyle}>
      <div ref={containerRef} style={contentStyle}>{children}</div>
      <BottomNav />
    </div>
  )
}
