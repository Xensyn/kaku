import type { ReactNode, CSSProperties } from 'react'
import { ArrowLeft } from 'lucide-react'
import { IconButton } from '../ui/IconButton'
import { useAppStore } from '../../store/useAppStore'

interface HeaderProps {
  title: string
  showBack?: boolean
  onBack?: () => void
  right?: ReactNode
}

export function Header({ title, showBack = false, onBack, right }: HeaderProps) {
  const goBack = useAppStore((s) => s.goBack)

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    height: 'var(--header-height)',
    padding: '0 8px',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    gap: '4px',
    flexShrink: 0,
  }

  const titleStyle: CSSProperties = {
    flex: 1,
    fontSize: '17px',
    fontWeight: 700,
    padding: '0 8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }

  return (
    <header style={headerStyle}>
      {showBack && (
        <IconButton onClick={onBack || goBack} label="Retour">
          <ArrowLeft size={22} />
        </IconButton>
      )}
      <h1 style={titleStyle}>{title}</h1>
      {right && <div style={{ display: 'flex', gap: '4px' }}>{right}</div>}
    </header>
  )
}
