// Types pour les modèles de cartes (templates)

import type { MediaBlock } from './card'

export interface TemplateBlock extends Omit<MediaBlock, 'id' | 'order'> {
  // Les blocs templates n'ont pas d'id ni de contenu réel
}

export interface CardTemplate {
  id: string
  name: string
  /** Blocs recto (sans contenu, juste le type) */
  frontBlocks: Array<{ type: MediaBlock['type'] }>
  /** Blocs verso (sans contenu, juste le type) */
  backBlocks: Array<{ type: MediaBlock['type'] }>
  builtIn: boolean
  createdAt: string
}
