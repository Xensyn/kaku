// Types pour les cartes et blocs de contenu

export type MediaBlockType = 'text' | 'image' | 'audio' | 'video' | 'drawing'

export interface DrawingPoint {
  x: number
  y: number
  pressure: number
}

export interface DrawingStroke {
  id: string
  points: DrawingPoint[]
  color: string
  width: number
  tool: 'pen' | 'eraser'
}

export interface MediaBlock {
  id: string
  type: MediaBlockType
  order: number
  // Contenu texte (HTML)
  textContent?: string
  // Référence vers la table media (images, audio, video)
  mediaId?: string
  // Données vectorielles du dessin
  drawingStrokes?: DrawingStroke[]
  // Référence vers le rendu PNG du dessin
  drawingPngId?: string
}

export interface CardSide {
  blocks: MediaBlock[]
}

export type SRSAlgorithm = 'fsrs' | 'sm2'

export interface SRSCardData {
  algorithm: SRSAlgorithm
  // SM-2
  sm2Level?: number
  sm2Ease?: number
  sm2Interval?: number
  // FSRS (objet Card ts-fsrs sérialisé)
  fsrsCard?: string
  // Commun
  nextReview: string // ISO date YYYY-MM-DD
  lastReview?: string
  state: 'new' | 'learning' | 'review' | 'relearning'
}

export interface Card {
  id: string
  deckId: string
  front: CardSide
  back: CardSide
  tags: string[]
  bidirectional: boolean
  createdAt: string
  updatedAt: string
  srs: SRSCardData
  srsReverse?: SRSCardData
}
