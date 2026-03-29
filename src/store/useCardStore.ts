// Store pour les opérations CRUD sur les cartes

import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { db } from '../db/database'
import type { Card, CardSide, MediaBlock, SRSAlgorithm } from '../types/card'
import { createNewSRSData } from '../lib/srs-engine'

interface CardStoreState {
  createCard: (deckId: string, algorithm: SRSAlgorithm) => Promise<string>
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  updateCardSide: (cardId: string, side: 'front' | 'back', cardSide: CardSide) => Promise<void>
  addTextBlock: (cardId: string, side: 'front' | 'back', text: string) => Promise<void>
  updateTextBlock: (cardId: string, side: 'front' | 'back', blockId: string, text: string) => Promise<void>
  removeBlock: (cardId: string, side: 'front' | 'back', blockId: string) => Promise<void>
  moveCard: (cardId: string, targetDeckId: string) => Promise<void>
}

function createEmptySide(): CardSide {
  return {
    blocks: [{
      id: uuid(),
      type: 'text',
      order: 0,
      textContent: '',
    }],
  }
}

export const useCardStore = create<CardStoreState>(() => ({
  createCard: async (deckId, algorithm) => {
    const id = uuid()
    const now = new Date().toISOString()
    const card: Card = {
      id,
      deckId,
      front: createEmptySide(),
      back: createEmptySide(),
      tags: [],
      bidirectional: false,
      createdAt: now,
      updatedAt: now,
      srs: createNewSRSData(algorithm),
    }
    await db.cards.add(card)
    return id
  },

  updateCard: async (id, updates) => {
    await db.cards.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })
  },

  deleteCard: async (id) => {
    await db.cards.delete(id)
  },

  updateCardSide: async (cardId, side, cardSide) => {
    await db.cards.update(cardId, {
      [side]: cardSide,
      updatedAt: new Date().toISOString(),
    } as Partial<Card>)
  },

  addTextBlock: async (cardId, side, text) => {
    const card = await db.cards.get(cardId)
    if (!card) return
    const blocks = [...card[side].blocks]
    const newBlock: MediaBlock = {
      id: uuid(),
      type: 'text',
      order: blocks.length,
      textContent: text,
    }
    blocks.push(newBlock)
    await db.cards.update(cardId, {
      [side]: { blocks },
      updatedAt: new Date().toISOString(),
    } as Partial<Card>)
  },

  updateTextBlock: async (cardId, side, blockId, text) => {
    const card = await db.cards.get(cardId)
    if (!card) return
    const blocks = card[side].blocks.map((b) =>
      b.id === blockId ? { ...b, textContent: text } : b
    )
    await db.cards.update(cardId, {
      [side]: { blocks },
      updatedAt: new Date().toISOString(),
    } as Partial<Card>)
  },

  removeBlock: async (cardId, side, blockId) => {
    const card = await db.cards.get(cardId)
    if (!card) return
    const blocks = card[side].blocks
      .filter((b) => b.id !== blockId)
      .map((b, i) => ({ ...b, order: i }))
    await db.cards.update(cardId, {
      [side]: { blocks },
      updatedAt: new Date().toISOString(),
    } as Partial<Card>)
  },

  moveCard: async (cardId, targetDeckId) => {
    await db.cards.update(cardId, {
      deckId: targetDeckId,
      updatedAt: new Date().toISOString(),
    })
  },
}))
