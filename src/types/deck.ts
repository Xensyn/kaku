// Types pour les decks

import type { SRSAlgorithm } from './card'

export interface DeckSettings {
  algorithm: SRSAlgorithm
  newCardsPerDay: number
  reviewsPerDay: number
  // FSRS
  fsrsRequestRetention?: number // 0.0 - 1.0, défaut 0.9
  fsrsMaxInterval?: number // Jours, défaut 36500
  // SM-2
  sm2InitialEase?: number // Défaut 2.5
}

export interface Deck {
  id: string
  name: string
  parentId: string // '' = deck racine
  order: number
  settings: DeckSettings
  color?: string
  icon?: string
  createdAt: string
  updatedAt: string
}

export const DEFAULT_DECK_SETTINGS: DeckSettings = {
  algorithm: 'fsrs',
  newCardsPerDay: 20,
  reviewsPerDay: 200,
  fsrsRequestRetention: 0.9,
  fsrsMaxInterval: 36500,
  sm2InitialEase: 2.5,
}
