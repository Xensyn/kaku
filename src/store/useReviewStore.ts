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
  // Compteur de nouvelles cartes dans la session courante
  newCardsInSession: number

  startSession: (deckId: string, tags?: string[]) => Promise<number>
  startCramSession: (deckId: string, tags?: string[]) => Promise<number>
  flipCard: () => void
  rateCard: (rating: Rating) => Promise<void>
  endSession: () => void
}

export const useReviewStore = create<ReviewStoreState>((set, get) => ({
  session: null,
  currentCard: null,
  intervals: null,
  newCardsInSession: 0,

  startSession: async (deckId, tags) => {
    // Récupérer les cartes du deck + tous ses sous-decks
    const descendantIds = await getDescendantDeckIds(deckId)
    const allDeckIds = [deckId, ...descendantIds]
    const allCards: Card[] = []
    for (const id of allDeckIds) {
      const cards = await db.cards.where('deckId').equals(id).toArray()
      allCards.push(...cards)
    }

    // Filtrer par tags si nécessaire
    const tagFiltered = tags && tags.length > 0
      ? allCards.filter((c) => c.tags.some((t) => tags.includes(t)))
      : allCards

    const dueCards = tagFiltered.filter((c) => isDue(c.srs))

    // Récupérer les settings du deck
    const deck = await db.decks.get(deckId)
    const newCardsLimit = deck?.settings.newCardsPerDay ?? 20
    const reviewsLimit = deck?.settings.reviewsPerDay ?? 200

    if (dueCards.length === 0) {
      set({ session: null, currentCard: null, intervals: null, newCardsInSession: 0 })
      return 0
    }

    // Séparer nouvelles cartes et révisions
    const newCards = dueCards.filter((c) => c.srs.state === 'new')
    const reviewCards = dueCards.filter((c) => c.srs.state !== 'new')

    // Appliquer les limites
    const shuffledNew = newCards.sort(() => Math.random() - 0.5).slice(0, newCardsLimit)
    const shuffledReview = reviewCards.sort(() => Math.random() - 0.5)

    // Combiner et respecter la limite totale de révisions
    const combined = [...shuffledNew, ...shuffledReview]
      .sort(() => Math.random() - 0.5)
      .slice(0, reviewsLimit)

    // Construire les cartes de session
    const sessionCards: SessionCard[] = []
    for (const card of combined) {
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
      isCram: false,
      newCardsLimit,
      reviewsLimit,
    }

    // Charger la première carte
    const firstCard = combined[0]
    const intervals = deck
      ? getIntervalPreview(firstCard.srs, deck.settings)
      : getIntervalPreview(firstCard.srs)

    set({ session, currentCard: firstCard, intervals, newCardsInSession: shuffledNew.length })
    return sessionCards.length
  },

  startCramSession: async (deckId, tags) => {
    // Mode Cram : toutes les cartes du deck, pas seulement celles dues
    const descendantIds = await getDescendantDeckIds(deckId)
    const allDeckIds = [deckId, ...descendantIds]
    const allCards: Card[] = []
    for (const id of allDeckIds) {
      const cards = await db.cards.where('deckId').equals(id).toArray()
      allCards.push(...cards)
    }

    // Filtrer par tags si nécessaire
    const filtered = tags && tags.length > 0
      ? allCards.filter((c) => c.tags.some((t) => tags.includes(t)))
      : allCards

    if (filtered.length === 0) {
      set({ session: null, currentCard: null, intervals: null, newCardsInSession: 0 })
      return 0
    }

    const deck = await db.decks.get(deckId)
    const shuffled = filtered.sort(() => Math.random() - 0.5)

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
      isCram: true,
      newCardsLimit: shuffled.length,
      reviewsLimit: sessionCards.length,
    }

    const firstCard = shuffled[0]
    const intervals = deck
      ? getIntervalPreview(firstCard.srs, deck.settings)
      : getIntervalPreview(firstCard.srs)

    set({ session, currentCard: firstCard, intervals, newCardsInSession: 0 })
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

    // En mode Cram : ne pas sauvegarder les logs ni mettre à jour le SRS
    if (!session.isCram) {
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
      await db.cards.update(currentCard.id, update as Partial<Card>)
    }

    // Passer à la carte suivante
    const nextIndex = session.currentIndex + 1
    if (nextIndex >= session.cards.length) {
      // Fin de session
      set({ session: null, currentCard: null, intervals: null, newCardsInSession: 0 })
      return
    }

    // Charger la carte suivante
    const nextSessionCard = session.cards[nextIndex]
    const nextCard = await db.cards.get(nextSessionCard.cardId)
    if (!nextCard) {
      set({ session: null, currentCard: null, intervals: null, newCardsInSession: 0 })
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
    set({ session: null, currentCard: null, intervals: null, newCardsInSession: 0 })
  },
}))
