// Types pour les révisions

import type { SRSAlgorithm } from './card'

export type Rating = 1 | 2 | 3 | 4 // Again, Hard, Good, Easy

export const RATING_LABELS: Record<Rating, string> = {
  1: 'À revoir',
  2: 'Difficile',
  3: 'Bien',
  4: 'Facile',
}

export interface ReviewLog {
  id?: number // Auto-increment IndexedDB
  cardId: string
  deckId: string
  rating: Rating
  direction: 'normal' | 'reverse'
  reviewedAt: string
  elapsedMs: number
  algorithm: SRSAlgorithm
  previousState: string // JSON de SRSCardData
}

export interface SessionCard {
  cardId: string
  direction: 'normal' | 'reverse'
}

export interface ReviewSession {
  deckId: string
  cards: SessionCard[]
  currentIndex: number
  startedAt: string
  isFlipped: boolean
  cardStartedAt: number // timestamp pour mesurer le temps de réponse
  isCram: boolean
  // Compteurs pour les limites journalières
  newCardsLimit: number
  reviewsLimit: number
}
