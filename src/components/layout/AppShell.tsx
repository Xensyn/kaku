import type { ReactNode, CSSProperties } from 'react'
import { BottomNav } from './BottomNav'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
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
      <div style={contentStyle}>{children}</div>
      <BottomNav />
    </div>
  )
}
