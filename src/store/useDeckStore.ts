// Store pour les opérations CRUD sur les decks

import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { db } from '../db/database'
import type { Deck, DeckSettings } from '../types/deck'
import { DEFAULT_DECK_SETTINGS } from '../types/deck'

interface DeckStoreState {
  createDeck: (name: string, parentId?: string) => Promise<string>
  updateDeck: (id: string, updates: Partial<Deck>) => Promise<void>
  deleteDeck: (id: string) => Promise<void>
  updateDeckSettings: (id: string, settings: Partial<DeckSettings>) => Promise<void>
  moveDeck: (id: string, newParentId: string) => Promise<void>
}

// parentId = '' pour les decks racines (Dexie ne peut pas indexer null)
const ROOT_PARENT = ''

export const useDeckStore = create<DeckStoreState>(() => ({
  createDeck: async (name, parentId = ROOT_PARENT) => {
    const id = uuid()
    const now = new Date().toISOString()

    // Hériter des settings du parent si c'est un sous-deck
    let settings = { ...DEFAULT_DECK_SETTINGS }
    if (parentId) {
      const parent = await db.decks.get(parentId)
      if (parent) settings = { ...parent.settings }
    }

    // Trouver l'ordre maximum parmi les siblings
    const siblings = await db.decks.where('parentId').equals(parentId).toArray()
    const maxOrder = siblings.reduce((max, d) => Math.max(max, d.order), -1)

    const deck: Deck = {
      id,
      name,
      parentId,
      order: maxOrder + 1,
      settings,
      createdAt: now,
      updatedAt: now,
    }

    await db.decks.add(deck)
    return id
  },

  updateDeck: async (id, updates) => {
    await db.decks.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })
  },

  deleteDeck: async (id) => {
    // Supprimer toutes les cartes du deck
    await db.cards.where('deckId').equals(id).delete()
    // Supprimer les sous-decks récursivement
    const subDecks = await db.decks.where('parentId').equals(id).toArray()
    for (const sub of subDecks) {
      await useDeckStore.getState().deleteDeck(sub.id)
    }
    // Supprimer le deck lui-même
    await db.decks.delete(id)
  },

  updateDeckSettings: async (id, settings) => {
    const deck = await db.decks.get(id)
    if (!deck) return
    await db.decks.update(id, {
      settings: { ...deck.settings, ...settings },
      updatedAt: new Date().toISOString(),
    })
  },

  moveDeck: async (id, newParentId) => {
    const siblings = await db.decks.where('parentId').equals(newParentId).toArray()
    const maxOrder = siblings.reduce((max, d) => Math.max(max, d.order), -1)
    await db.decks.update(id, {
      parentId: newParentId,
      order: maxOrder + 1,
      updatedAt: new Date().toISOString(),
    })
  },
}))
