// Gestion des modèles de cartes (templates)

import { db } from './database'
import type { CardTemplate } from '../types/template'

export const BUILT_IN_TEMPLATES: CardTemplate[] = [
  {
    id: 'builtin-basic',
    name: 'Basique',
    frontBlocks: [{ type: 'text' }],
    backBlocks: [{ type: 'text' }],
    builtIn: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-vocabulary',
    name: 'Vocabulaire',
    frontBlocks: [{ type: 'text' }, { type: 'audio' }],
    backBlocks: [{ type: 'text' }],
    builtIn: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-image',
    name: 'Image',
    frontBlocks: [{ type: 'image' }, { type: 'text' }],
    backBlocks: [{ type: 'text' }],
    builtIn: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
]

/** Initialise les templates intégrés si la table est vide */
export async function seedBuiltInTemplates(): Promise<void> {
  const count = await db.templates.count()
  if (count === 0) {
    await db.templates.bulkPut(BUILT_IN_TEMPLATES)
  }
}

/** Retourne tous les templates */
export async function getAllTemplates(): Promise<CardTemplate[]> {
  return db.templates.orderBy('createdAt').toArray()
}

/** Sauvegarde un nouveau template */
export async function saveTemplate(template: CardTemplate): Promise<void> {
  await db.templates.put(template)
}

/** Supprime un template (uniquement les templates non-intégrés) */
export async function deleteTemplate(id: string): Promise<void> {
  const tmpl = await db.templates.get(id)
  if (tmpl && !tmpl.builtIn) {
    await db.templates.delete(id)
  }
}
