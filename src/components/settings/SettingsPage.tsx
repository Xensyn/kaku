import { useState, useEffect, type CSSProperties } from 'react'
import { Moon, Sun, Info, Download, Upload, Shield, Clock, Palette, Bell, BellOff, FileInput } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { db } from '../../db/database'
import { Header } from '../layout/Header'
import { Button } from '../ui/Button'
import {
  getLastBackupMeta,
  getBackupInterval,
  setBackupInterval,
  createBackup,
  downloadLastBackup,
  type BackupMeta,
} from '../../lib/autoBackup'
import { ACCENT_COLORS, setAccentColor, getAccentColor } from '../../lib/theme'
import {
  isNotificationEnabled,
  setNotificationEnabled,
  requestNotificationPermission,
  getNotificationPermission,
  startNotificationScheduler,
  stopNotificationScheduler,
} from '../../lib/notifications'

const INTERVAL_OPTIONS = [
  { label: '6 heures', value: 6 * 60 * 60 * 1000 },
  { label: '12 heures', value: 12 * 60 * 60 * 1000 },
  { label: '24 heures', value: 24 * 60 * 60 * 1000 },
  { label: '3 jours', value: 3 * 24 * 60 * 60 * 1000 },
  { label: '7 jours', value: 7 * 24 * 60 * 60 * 1000 },
]

export function SettingsPage() {
  const { theme, toggleTheme, navigate } = useAppStore()
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [backupMeta, setBackupMeta] = useState<BackupMeta | null>(null)
  const [backupInterval, setBackupIntervalState] = useState(getBackupInterval())
  const [isPersistent, setIsPersistent] = useState<boolean | null>(null)
  const [backupRunning, setBackupRunning] = useState(false)
  const [currentAccent, setCurrentAccent] = useState<string>(getAccentColor())

  // Notifications
  const [notifEnabled, setNotifEnabled] = useState(isNotificationEnabled())
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(getNotificationPermission())

  useEffect(() => {
    setBackupMeta(getLastBackupMeta())
    // Vérifier si le stockage persistant est actif
    if (navigator.storage?.persisted) {
      navigator.storage.persisted().then(setIsPersistent)
    }
  }, [])

  const handleExport = async () => {
    const decks = await db.decks.toArray()
    const cards = await db.cards.toArray()
    const reviewLogs = await db.reviewLogs.toArray()
    const media = await db.media.toArray()

    const mediaWithBase64 = await Promise.all(
      media.map(async (m) => {
        if (m.blob instanceof Blob) {
          const buffer = await m.blob.arrayBuffer()
          const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          )
          return { ...m, blob: undefined, base64, mimeType: m.blob.type }
        }
        return m
      })
    )

    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      decks,
      cards,
      reviewLogs,
      media: mediaWithBase64,
    }

    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kaku-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)

        if (!data.version || !data.decks || !data.cards) {
          setImportStatus('Format de fichier invalide')
          return
        }

        await db.transaction('rw', [db.decks, db.cards, db.reviewLogs, db.media], async () => {
          await db.decks.clear()
          await db.cards.clear()
          await db.reviewLogs.clear()
          await db.media.clear()

          if (data.decks.length > 0) await db.decks.bulkAdd(data.decks)
          if (data.cards.length > 0) await db.cards.bulkAdd(data.cards)
          if (data.reviewLogs.length > 0) await db.reviewLogs.bulkAdd(data.reviewLogs)

          if (data.media) {
            for (const m of data.media) {
              if (m.base64 && m.mimeType) {
                const binary = atob(m.base64)
                const bytes = new Uint8Array(binary.length)
                for (let i = 0; i < binary.length; i++) {
                  bytes[i] = binary.charCodeAt(i)
                }
                const blob = new Blob([bytes], { type: m.mimeType })
                await db.media.add({ ...m, blob, base64: undefined, mimeType: undefined })
              } else {
                await db.media.add(m)
              }
            }
          }
        })

        setImportStatus(`Import réussi : ${data.decks.length} decks, ${data.cards.length} cartes`)
      } catch {
        setImportStatus('Erreur lors de l\'import')
      }
    }
    input.click()
  }

  const handleForceBackup = async () => {
    setBackupRunning(true)
    try {
      const { meta, json } = await createBackup()
      // Stocker dans localStorage
      if (json.length < 5 * 1024 * 1024) {
        try { localStorage.setItem('kaku-backup-data', json) } catch { /* plein */ }
      }
      setBackupMeta(meta)
    } finally {
      setBackupRunning(false)
    }
  }

  const handleDownloadBackup = () => {
    if (!downloadLastBackup()) {
      setImportStatus('Aucun backup disponible')
    }
  }

  const handleIntervalChange = (value: number) => {
    setBackupInterval(value)
    setBackupIntervalState(value)
  }

  const handleAccentChange = (hex: string) => {
    setAccentColor(hex)
    setCurrentAccent(hex)
  }

  const handleNotifToggle = async () => {
    if (!notifEnabled) {
      // Activer : demander la permission si nécessaire
      const perm = await requestNotificationPermission()
      setNotifPermission(perm)
      if (perm === 'granted') {
        setNotificationEnabled(true)
        setNotifEnabled(true)
        startNotificationScheduler()
      }
    } else {
      setNotificationEnabled(false)
      setNotifEnabled(false)
      stopNotificationScheduler()
    }
  }

  const formatBackupDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Header title="Réglages" />

      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Apparence */}
        <div style={sectionStyle}>
          <h3 style={sectionLabelStyle}>Apparence</h3>
          <div style={rowStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              <span style={{ fontWeight: 500 }}>Thème sombre</span>
            </div>
            <button style={toggleBtnStyle(theme === 'dark')} onClick={toggleTheme}>
              <div style={toggleKnobStyle(theme === 'dark')} />
            </button>
          </div>

          {/* Couleur d'accent */}
          <div style={{ ...rowStyle, flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Palette size={20} />
              <span style={{ fontWeight: 500 }}>Couleur d'accent</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={() => handleAccentChange(c.value)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: c.value,
                    border: currentAccent.toLowerCase() === c.value.toLowerCase()
                      ? '3px solid var(--text-primary)'
                      : '3px solid transparent',
                    cursor: 'pointer',
                    outline: currentAccent.toLowerCase() === c.value.toLowerCase()
                      ? '2px solid ' + c.value
                      : 'none',
                    outlineOffset: '2px',
                    transition: 'all var(--transition)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div style={sectionStyle}>
          <h3 style={sectionLabelStyle}>Notifications</h3>
          <div style={rowStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {notifEnabled ? <Bell size={20} /> : <BellOff size={20} />}
              <div>
                <div style={{ fontWeight: 500 }}>Rappels de révision</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {notifPermission === 'denied'
                    ? 'Notifications bloquées par le navigateur'
                    : notifPermission === 'granted'
                      ? 'Permission accordée'
                      : 'Permission non encore demandée'}
                </div>
              </div>
            </div>
            <button
              style={toggleBtnStyle(notifEnabled)}
              onClick={handleNotifToggle}
              disabled={notifPermission === 'denied'}
              aria-label={notifEnabled ? 'Désactiver les notifications' : 'Activer les notifications'}
            >
              <div style={toggleKnobStyle(notifEnabled)} />
            </button>
          </div>
        </div>

        {/* Protection des données */}
        <div style={sectionStyle}>
          <h3 style={sectionLabelStyle}>Protection des données</h3>
          <div style={{ ...rowStyle, flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={18} color={isPersistent ? 'var(--success)' : 'var(--warning)'} />
              <div>
                <div style={{ fontWeight: 500, fontSize: '14px' }}>Stockage persistant</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {isPersistent === null
                    ? 'Non supporté par ce navigateur'
                    : isPersistent
                      ? 'Actif — le navigateur ne supprimera pas vos données'
                      : 'Inactif — les données peuvent être effacées par le navigateur'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Backup automatique */}
        <div style={sectionStyle}>
          <h3 style={sectionLabelStyle}>Backup automatique</h3>
          <div style={{ ...rowStyle, flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={18} />
              <span style={{ fontWeight: 500, fontSize: '14px' }}>Fréquence</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {INTERVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  style={{
                    ...chipStyle,
                    background: backupInterval === opt.value ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: backupInterval === opt.value ? '#fff' : 'var(--text-secondary)',
                  }}
                  onClick={() => handleIntervalChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {backupMeta && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '4px 0' }}>
                Dernier backup : {formatBackupDate(backupMeta.date)} — {backupMeta.deckCount} decks, {backupMeta.cardCount} cartes ({formatSize(backupMeta.size)})
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" fullWidth onClick={handleForceBackup} disabled={backupRunning}>
                {backupRunning ? 'Backup...' : 'Sauvegarder maintenant'}
              </Button>
              <Button variant="secondary" fullWidth onClick={handleDownloadBackup}>
                <Download size={14} />
                Télécharger
              </Button>
            </div>
          </div>
        </div>

        {/* Export / Import */}
        <div style={sectionStyle}>
          <h3 style={sectionLabelStyle}>Données</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" fullWidth onClick={handleExport}>
              <Download size={16} />
              Exporter
            </Button>
            <Button variant="secondary" fullWidth onClick={handleImport}>
              <Upload size={16} />
              Importer
            </Button>
          </div>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => navigate('import')}
            style={{ border: '1px solid var(--border)', marginTop: '4px' }}
          >
            <FileInput size={16} />
            Importer depuis Anki
          </Button>
          {importStatus && (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
              {importStatus}
            </div>
          )}
        </div>

        {/* À propos */}
        <div style={sectionStyle}>
          <h3 style={sectionLabelStyle}>À propos</h3>
          <div style={{ ...rowStyle, flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={18} />
              <span style={{ fontWeight: 600 }}>Kaku</span>
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', paddingLeft: '26px' }}>
              Application de répétition espacée. Algorithmes FSRS et SM-2.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

const sectionStyle: CSSProperties = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px',
  background: 'var(--bg-card)',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  minHeight: 'var(--touch-min)',
}

const sectionLabelStyle: CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  padding: '0 4px',
}

const chipStyle: CSSProperties = {
  padding: '5px 10px',
  borderRadius: '12px',
  border: 'none',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all var(--transition)',
}

function toggleBtnStyle(active: boolean): CSSProperties {
  return {
    width: '52px',
    height: '30px',
    borderRadius: '15px',
    background: active ? 'var(--accent)' : 'var(--border)',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background var(--transition)',
  }
}

function toggleKnobStyle(active: boolean): CSSProperties {
  return {
    position: 'absolute',
    top: '3px',
    left: active ? '25px' : '3px',
    width: '24px',
    height: '24px',
    borderRadius: '12px',
    background: '#fff',
    transition: 'left var(--transition)',
  }
}
