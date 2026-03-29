// Système de backup automatique périodique
// Stocke le dernier backup dans localStorage (métadonnées) + génère un JSON téléchargeable

import { db } from '../db/database'

const BACKUP_KEY = 'kaku-last-backup'
const BACKUP_INTERVAL_KEY = 'kaku-backup-interval'
const DEFAULT_INTERVAL = 24 * 60 * 60 * 1000 // 24h

let timer: ReturnType<typeof setInterval> | null = null

export interface BackupMeta {
  date: string
  deckCount: number
  cardCount: number
  size: number // taille approximative en octets
}

export function getBackupInterval(): number {
  try {
    const saved = localStorage.getItem(BACKUP_INTERVAL_KEY)
    if (saved) return parseInt(saved, 10)
  } catch { /* ignore */ }
  return DEFAULT_INTERVAL
}

export function setBackupInterval(ms: number) {
  localStorage.setItem(BACKUP_INTERVAL_KEY, String(ms))
  startAutoBackup() // redémarrer avec le nouvel intervalle
}

export function getLastBackupMeta(): BackupMeta | null {
  try {
    const saved = localStorage.getItem(BACKUP_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return null
}

export async function createBackup(): Promise<{ json: string; meta: BackupMeta }> {
  const decks = await db.decks.toArray()
  const cards = await db.cards.toArray()
  const reviewLogs = await db.reviewLogs.toArray()
  const media = await db.media.toArray()

  // Convertir les blobs en base64
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
    autoBackup: true,
    decks,
    cards,
    reviewLogs,
    media: mediaWithBase64,
  }

  const json = JSON.stringify(data)

  const meta: BackupMeta = {
    date: data.exportedAt,
    deckCount: decks.length,
    cardCount: cards.length,
    size: json.length,
  }

  // Sauvegarder les métadonnées
  localStorage.setItem(BACKUP_KEY, JSON.stringify(meta))

  return { json, meta }
}

export async function runBackupIfNeeded(): Promise<boolean> {
  const last = getLastBackupMeta()
  const interval = getBackupInterval()

  if (last) {
    const elapsed = Date.now() - new Date(last.date).getTime()
    if (elapsed < interval) return false
  }

  // Vérifier qu'il y a des données à sauvegarder
  const cardCount = await db.cards.count()
  if (cardCount === 0) return false

  const { json } = await createBackup()

  // Stocker le backup dans un deuxième emplacement (localStorage avec compression simple)
  // On ne stocke que si < 5 Mo (limite localStorage ~10 Mo)
  if (json.length < 5 * 1024 * 1024) {
    try {
      localStorage.setItem('kaku-backup-data', json)
    } catch {
      // localStorage plein — pas grave, le backup manuel reste disponible
    }
  }

  return true
}

export function downloadLastBackup() {
  const data = localStorage.getItem('kaku-backup-data')
  if (!data) return false

  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kaku-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  return true
}

export function startAutoBackup() {
  if (timer) clearInterval(timer)

  // Premier backup au lancement (après 10 secondes pour ne pas bloquer le démarrage)
  setTimeout(() => runBackupIfNeeded(), 10_000)

  // Puis à intervalle régulier
  const interval = getBackupInterval()
  timer = setInterval(() => runBackupIfNeeded(), interval)
}

export function stopAutoBackup() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
