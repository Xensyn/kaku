import { useState, useEffect, type CSSProperties } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '../ui/Button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!deferredPrompt || dismissed) return null

  const handleInstall = async () => {
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  return (
    <div style={bannerStyle}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Download size={18} />
        <span style={{ fontSize: '14px' }}>Installer Kaku sur cet appareil</span>
      </div>
      <Button onClick={handleInstall} style={{ padding: '6px 14px', fontSize: '13px' }}>
        Installer
      </Button>
      <button style={closeStyle} onClick={() => setDismissed(true)}>
        <X size={16} />
      </button>
    </div>
  )
}

const bannerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 12px',
  background: 'var(--bg-card)',
  borderTop: '1px solid var(--border)',
  position: 'fixed',
  bottom: 56,
  left: 0,
  right: 0,
  zIndex: 100,
}

const closeStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  border: 'none',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
}
