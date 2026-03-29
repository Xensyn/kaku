import { type ReactNode, useEffect, useCallback, type CSSProperties } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open) return null

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
    animation: 'fadeIn 150ms ease',
  }

  const panelStyle: CSSProperties = {
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '80dvh',
    overflow: 'auto',
    padding: '24px',
    animation: 'fadeInUp 200ms ease',
  }

  const titleStyle: CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    marginBottom: '16px',
    color: 'var(--text-primary)',
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        {title && <h2 style={titleStyle}>{title}</h2>}
        {children}
      </div>
    </div>
  )
}
