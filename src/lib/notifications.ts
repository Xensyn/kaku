// Gestion des notifications locales (PWA)

import { db } from '../db/database'

const STORAGE_KEY = 'kaku-notifications'
const LAST_CHECK_KEY = 'kaku-notif-last-check'

/** Lire la préférence utilisateur */
export function isNotificationEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/** Sauvegarder la préférence */
export function setNotificationEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false')
  } catch { /* ignore */ }
}

/** Demander la permission de notification */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

/** Statut de la permission actuelle */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

/** Afficher une notification */
function showNotification(body: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  new Notification('Kaku', {
    body,
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    tag: 'kaku-review-reminder',
  })
}

/** Vérifier les cartes dues et envoyer une notification si nécessaire */
export async function checkAndNotify(): Promise<void> {
  if (!isNotificationEnabled()) return
  if (getNotificationPermission() !== 'granted') return

  // Éviter de notifier plusieurs fois dans la même heure
  const lastCheck = localStorage.getItem(LAST_CHECK_KEY)
  const now = Date.now()
  if (lastCheck && now - parseInt(lastCheck, 10) < 60 * 60 * 1000) return

  const today = new Date().toISOString().slice(0, 10)
  try {
    const dueCount = await db.cards
      .filter((card) => card.srs.nextReview <= today)
      .count()

    if (dueCount > 0) {
      showNotification(
        dueCount === 1
          ? 'Vous avez 1 carte à réviser !'
          : `Vous avez ${dueCount} cartes à réviser !`
      )
      localStorage.setItem(LAST_CHECK_KEY, String(now))
    }
  } catch { /* ignore les erreurs DB */ }
}

let notifIntervalId: ReturnType<typeof setInterval> | null = null

/** Démarrer la vérification périodique (toutes les heures) */
export function startNotificationScheduler(): void {
  if (notifIntervalId !== null) return
  // Vérification immédiate puis toutes les heures
  checkAndNotify()
  notifIntervalId = setInterval(checkAndNotify, 60 * 60 * 1000)
}

/** Arrêter la vérification périodique */
export function stopNotificationScheduler(): void {
  if (notifIntervalId !== null) {
    clearInterval(notifIntervalId)
    notifIntervalId = null
  }
}
