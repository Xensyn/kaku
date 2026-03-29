// Base de données IndexedDB via Dexie

import Dexie, { type Table } from 'dexie'
import type { Card } from '../types/card'
import type { Deck } from '../types/deck'
import type { ReviewLog } from '../types/review'
import type { MediaRecord } from '../types/media'
import type { CardTemplate } from '../types/template'

export class KakuDB extends Dexie {
  decks!: Table<Deck>
  cards!: Table<Card>
  reviewLogs!: Table<ReviewLog>
  media!: Table<MediaRecord>
  templates!: Table<CardTemplate>

  constructor() {
    super('kaku-db')

    this.version(1).stores({
      decks: 'id, parentId, order',
      cards: 'id, deckId, [deckId+srs.nextReview]',
      reviewLogs: '++id, cardId, deckId, reviewedAt',
      media: 'id, type, createdAt',
    })

    // Migration v2 : convertir parentId null → ''
    this.version(2).stores({
      decks: 'id, parentId, order',
      cards: 'id, deckId, [deckId+srs.nextReview]',
      reviewLogs: '++id, cardId, deckId, reviewedAt',
      media: 'id, type, createdAt',
    }).upgrade(async (tx) => {
      await tx.table('decks').toCollection().modify((deck) => {
        if (deck.parentId === null || deck.parentId === undefined) {
          deck.parentId = ''
        }
      })
    })

    // Migration v3 : ajout de la table templates
    this.version(3).stores({
      decks: 'id, parentId, order',
      cards: 'id, deckId, [deckId+srs.nextReview]',
      reviewLogs: '++id, cardId, deckId, reviewedAt',
      media: 'id, type, createdAt',
      templates: 'id, builtIn, createdAt',
    })
  }
}

export const db = new KakuDB()
