// Hooks réactifs pour les requêtes Dexie

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './database'
import type { Card } from '../types/card'
import type { Deck } from '../types/deck'

// Tous les decks
export function useDecks(): Deck[] | undefined {
  return useLiveQuery(() => db.decks.orderBy('order').toArray())
}

// Decks racines (parentId = '')
export function useRootDecks(): Deck[] | undefined {
  return useLiveQuery(() =>
    db.decks.where('parentId').equals('').sortBy('order')
  )
}

// Sous-decks d'un deck
export function useSubDecks(parentId: string): Deck[] | undefined {
  return useLiveQuery(
    () => db.decks.where('parentId').equals(parentId).sortBy('order'),
    [parentId]
  )
}

// Cartes d'un deck
export function useDeckCards(deckId: string): Card[] | undefined {
  return useLiveQuery(
    () => db.cards.where('deckId').equals(deckId).toArray(),
    [deckId]
  )
}

// Cartes à réviser (due aujourd'hui ou avant) pour un deck uniquement
export function useDueCards(deckId: string): Card[] | undefined {
  const today = new Date().toISOString().slice(0, 10)
  return useLiveQuery(
    () =>
      db.cards
        .where('deckId')
        .equals(deckId)
        .filter((card) => card.srs.nextReview <= today)
        .toArray(),
    [deckId, today]
  )
}

// Nombre de cartes à réviser pour un deck uniquement
export function useDueCount(deckId: string): number | undefined {
  const today = new Date().toISOString().slice(0, 10)
  return useLiveQuery(
    () =>
      db.cards
        .where('deckId')
        .equals(deckId)
        .filter((card) => card.srs.nextReview <= today)
        .count(),
    [deckId, today]
  )
}

// Nombre total de cartes dans un deck uniquement
export function useCardCount(deckId: string): number | undefined {
  return useLiveQuery(
    () => db.cards.where('deckId').equals(deckId).count(),
    [deckId]
  )
}

// Récupérer tous les IDs de decks descendants (enfants, petits-enfants, etc.)
export async function getDescendantDeckIds(deckId: string): Promise<string[]> {
  const result: string[] = []
  const children = await db.decks.where('parentId').equals(deckId).toArray()
  for (const child of children) {
    result.push(child.id)
    const grandChildren = await getDescendantDeckIds(child.id)
    result.push(...grandChildren)
  }
  return result
}

// Nombre total de cartes à réviser pour un deck + tous ses sous-decks
export function useTotalDueCount(deckId: string): number | undefined {
  const today = new Date().toISOString().slice(0, 10)
  return useLiveQuery(
    async () => {
      const descendantIds = await getDescendantDeckIds(deckId)
      const allIds = [deckId, ...descendantIds]
      let total = 0
      for (const id of allIds) {
        const count = await db.cards
          .where('deckId')
          .equals(id)
          .filter((card) => card.srs.nextReview <= today)
          .count()
        total += count
      }
      return total
    },
    [deckId, today]
  )
}

// Nombre total de cartes pour un deck + tous ses sous-decks
export function useTotalCardCount(deckId: string): number | undefined {
  return useLiveQuery(
    async () => {
      const descendantIds = await getDescendantDeckIds(deckId)
      const allIds = [deckId, ...descendantIds]
      let total = 0
      for (const id of allIds) {
        total += await db.cards.where('deckId').equals(id).count()
      }
      return total
    },
    [deckId]
  )
}

// Un deck par ID
export function useDeck(deckId: string): Deck | undefined {
  return useLiveQuery(
    () => db.decks.get(deckId),
    [deckId]
  )
}

// Une carte par ID
export function useCard(cardId: string): Card | undefined {
  return useLiveQuery(
    () => db.cards.get(cardId),
    [cardId]
  )
}
