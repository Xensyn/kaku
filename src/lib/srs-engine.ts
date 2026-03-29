// Moteur SRS unifié : dispatche vers FSRS ou SM-2

import type { Rating } from '../types/review'
import type { SRSAlgorithm, SRSCardData } from '../types/card'
import type { DeckSettings } from '../types/deck'
import { applyFSRS, createNewFSRSData, fsrsPreview } from './fsrs-adapter'
import { applySM2, createNewSM2Data, sm2Preview } from './sm2'

export interface SchedulingResult {
  updatedSRSData: SRSCardData
  intervals: Record<Rating, number>
}

// Planifier une révision
export function scheduleReview(
  cardData: SRSCardData,
  rating: Rating,
  deckSettings?: DeckSettings
): SRSCardData {
  if (cardData.algorithm === 'fsrs') {
    return applyFSRS(
      cardData,
      rating,
      deckSettings?.fsrsRequestRetention,
      deckSettings?.fsrsMaxInterval
    )
  }
  return applySM2(cardData, rating)
}

// Prévisualisation des intervalles
export function getIntervalPreview(
  cardData: SRSCardData,
  deckSettings?: DeckSettings
): Record<Rating, number> {
  if (cardData.algorithm === 'fsrs') {
    return fsrsPreview(
      cardData,
      deckSettings?.fsrsRequestRetention,
      deckSettings?.fsrsMaxInterval
    )
  }
  return sm2Preview(cardData)
}

// Créer les données SRS pour une nouvelle carte
export function createNewSRSData(algorithm: SRSAlgorithm, deckSettings?: DeckSettings): SRSCardData {
  if (algorithm === 'fsrs') {
    return createNewFSRSData()
  }
  return createNewSM2Data(deckSettings?.sm2InitialEase)
}

// Vérifier si une carte est à réviser
export function isDue(cardData: SRSCardData): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return cardData.nextReview <= today
}

// Formater un intervalle en texte lisible
export function formatInterval(days: number): string {
  if (days === 0) return '< 1j'
  if (days < 1) return '< 1j'
  if (days === 1) return '1j'
  if (days < 30) return `${days}j`
  if (days < 365) {
    const months = Math.round(days / 30)
    return `${months}m`
  }
  const years = Math.round(days / 365 * 10) / 10
  return `${years}a`
}
