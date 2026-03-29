// Store pour la session de révision

import { create } from 'zustand'
import { db } from '../db/database'
import { getDescendantDeckIds } from '../db/hooks'
import type { Card } from '../types/card'
import type { Rating, ReviewSession, SessionCard } from '../types/review'
import { scheduleReview, isDue, getIntervalPreview } from '../lib/srs-engine'

interface ReviewStoreState {
  session: ReviewSession | null
  currentCard: Card | null
  intervals: Record<Rating, number> | null

  startSession: (deckId: string) => Promise<number>
  flipCard: () => void
  rateCard: (rating: Rating) => Promise<void>
  endSession: () => void
}

export const useReviewStore = create<ReviewStoreState>((set, get) => ({
  session: null,
  currentCard: null,
  intervals: null,

  startSession: async (deckId) => {
    // Récupérer les cartes du deck + tous ses sous-decks
    const descendantIds = await getDescendantDeckIds(deckId)
    const allDeckIds = [deckId, ...descendantIds]
    const allCards: Card[] = []
    for (const id of allDeckIds) {
      const cards = await db.cards.where('deckId').equals(id).toArray()
      allCards.push(...cards)
    }
    const dueCards = allCards.filter((c) => isDue(c.srs))

    // Récupérer les settings du deck
    const deck = await db.decks.get(deckId)

    if (dueCards.length === 0) {
      set({ session: null, currentCard: null, intervals: null })
      return 0
    }

    // Mélanger les cartes
    const shuffled = dueCards.sort(() => Math.random() - 0.5)

    // Construire les cartes de session
    const sessionCards: SessionCard[] = []
    for (const card of shuffled) {
      sessionCards.push({ cardId: card.id, direction: 'normal' })
      if (card.bidirectional) {
        sessionCards.push({ cardId: card.id, direction: 'reverse' })
      }
    }

    const session: ReviewSession = {
      deckId,
      cards: sessionCards,
      currentIndex: 0,
      startedAt: new Date().toISOString(),
      isFlipped: false,
      cardStartedAt: Date.now(),
    }

    // Charger la première carte
    const firstCard = shuffled[0]
    const intervals = deck
      ? getIntervalPreview(firstCard.srs, deck.settings)
      : getIntervalPreview(firstCard.srs)

    set({ session, currentCard: firstCard, intervals })
    return sessionCards.length
  },

  flipCard: () => {
    set((state) => {
      if (!state.session) return state
      return {
        session: { ...state.session, isFlipped: true },
      }
    })
  },

  rateCard: async (rating) => {
    const { session, currentCard } = get()
    if (!session || !currentCard) return

    const sessionCard = session.cards[session.currentIndex]
    const deck = await db.decks.get(session.deckId)
    const deckSettings = deck?.settings

    // Déterminer quelle donnée SRS mettre à jour
    const isReverse = sessionCard.direction === 'reverse'
    const srsData = isReverse ? currentCard.srsReverse : currentCard.srs

    if (!srsData) return

    // Calculer le nouveau scheduling
    const updatedSRS = scheduleReview(srsData, rating, deckSettings)

    // Sauvegarder le log de révision
    await db.reviewLogs.add({
      cardId: currentCard.id,
      deckId: session.deckId,
      rating,
      direction: sessionCard.direction,
      reviewedAt: new Date().toISOString(),
      elapsedMs: Date.now() - session.cardStartedAt,
      algorithm: srsData.algorithm,
      previousState: JSON.stringify(srsData),
    })

    // Mettre à jour la carte dans la DB
    const update = isReverse
      ? { srsReverse: updatedSRS, updatedAt: new Date().toISOString() }
      : { srs: updatedSRS, updatedAt: new Date().toISOString() }
    await db.cards.update(currentCard.id, update)

    // Passer à la carte suivante
    const nextIndex = session.currentIndex + 1
    if (nextIndex >= session.cards.length) {
      // Fin de session
      set({ session: null, currentCard: null, intervals: null })
      return
    }

    // Charger la carte suivante
    const nextSessionCard = session.cards[nextIndex]
    const nextCard = await db.cards.get(nextSessionCard.cardId)
    if (!nextCard) {
      set({ session: null, currentCard: null, intervals: null })
      return
    }

    const nextSRS = nextSessionCard.direction === 'reverse'
      ? nextCard.srsReverse
      : nextCard.srs
    const nextIntervals = nextSRS
      ? getIntervalPreview(nextSRS, deckSettings)
      : null

    set({
      session: {
        ...session,
        currentIndex: nextIndex,
        isFlipped: false,
        cardStartedAt: Date.now(),
      },
      currentCard: nextCard,
      intervals: nextIntervals,
    })
  },

  endSession: () => {
    set({ session: null, currentCard: null, intervals: null })
  },
}))
